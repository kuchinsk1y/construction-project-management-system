import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ProtocolStorageService } from './protocol-storage.service';

const PAID_STATUSES = ['ZAPŁACONE', 'ZAPŁACONA'];
const STATUSES = ['OCZEKUJE', 'WYSTAWIONA', 'ZAPŁACONE'];
const MAX_FILE_BYTES = 20 * 1024 * 1024;
// The acceptance protocol is stored as PDF only
const ALLOWED_MIME = ['application/pdf'];

export type CreateProtocolInput = {
  allocations: { milestoneId: string; percent: number }[];
  workIds: string[];
  issuedDate?: string;
  note?: string;
};

export type UpdateInvoiceInput = {
  invoiceNumber?: string | null;
  status?: string;
  link?: string | null;
  issuedDate?: string | null;
  note?: string;
};

type UploadedProtocol = { buffer: Buffer; mimetype: string; originalname: string; size: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Invoicing step of a milestone (e.g. 25 → 25/50/75/100%). Only values that split 100% evenly
 * count; anything else (old data overwritten with the invoiced share) means one invoice for 100%.
 */
export function invoicingStep(value: unknown): number {
  const v = Number(value ?? 0);
  return v > 0 && v <= 100 && Math.abs(100 / v - Math.round(100 / v)) < 0.01 ? v : 100;
}
const toDate = (d: Date | null) => d?.toISOString().split('T')[0] ?? null;
const naturalNo = (a: string, b: string) => a.localeCompare(b, 'pl', { numeric: true });

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ProtocolStorageService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Value of a milestone: contract milestones are a share of the contract, additional works have an amount */
  private milestoneTotal(
    m: { type: string; percentage: unknown; net_amount: unknown },
    contractValue: number,
  ) {
    return m.type === 'roboty_dodatkowe'
      ? Number(m.net_amount ?? 0)
      : round2(contractValue * (Number(m.percentage ?? 0) / 100));
  }

  async list(projectId: string) {
    const rows = await this.prisma.invoices.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
      include: this.include,
    });
    return rows.map((r) => this.map(r));
  }

  async get(id: string) {
    const row = await this.prisma.invoices.findUnique({ where: { id }, include: this.include });
    if (!row) throw new NotFoundException('Faktura nie istnieje');
    return row;
  }

  async create(projectId: string, userId: number, input: CreateProtocolInput, file?: UploadedProtocol) {
    if (!file) throw new BadRequestException('Dołącz protokół odbioru robót');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('Plik protokołu może mieć maksymalnie 20 MB');
    // Check the type and the file itself (a PDF starts with "%PDF")
    if (!ALLOWED_MIME.includes(file.mimetype) || file.buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
      throw new BadRequestException('Protokół musi być plikiem PDF');
    }
    if (!input.allocations?.length) throw new BadRequestException('Wybierz roboty do zafakturowania');

    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
      select: { id: true, name: true, currency: true, contract_net_value: true },
    });
    if (!project) throw new NotFoundException('Projekt nie istnieje');
    const contractValue = Number(project.contract_net_value ?? 0);

    const milestoneIds = [...new Set(input.allocations.map((a) => a.milestoneId))];
    if (milestoneIds.length !== input.allocations.length) {
      throw new BadRequestException('Każdy etap może wystąpić tylko raz');
    }
    const milestones = await this.prisma.milestones.findMany({
      where: { id: { in: milestoneIds }, project_id: projectId, deleted_at: null },
      include: { milestones_invoices: { select: { net_value: true } } },
    });
    if (milestones.length !== milestoneIds.length) throw new BadRequestException('Nieznany etap');

    // Each milestone is invoiced in steps of its invoicing percentage, up to what is left
    const lines = input.allocations.map((a) => {
      const m = milestones.find((x) => x.id === a.milestoneId)!;
      const total = this.milestoneTotal(m, contractValue);
      if (total <= 0) throw new BadRequestException(`${m.milestone_no}: etap nie ma wartości`);
      const invoiced = m.milestones_invoices.reduce((s, i) => s + Number(i.net_value), 0);
      const remainingPct = Math.max(0, round2(100 - (invoiced / total) * 100));
      const step = invoicingStep(m.invoicing_percentage);
      const percent = Number(a.percent);
      const isStep = Math.abs(percent / step - Math.round(percent / step)) < 1e-6;
      const isRest = Math.abs(percent - remainingPct) < 0.01;
      if (!(percent > 0) || (!isStep && !isRest)) {
        throw new BadRequestException(`${m.milestone_no}: dozwolone są wielokrotności ${step}%`);
      }
      if (percent > remainingPct + 0.01) {
        throw new BadRequestException(`${m.milestone_no}: pozostało do zafakturowania tylko ${remainingPct}%`);
      }
      return { milestone: m, percent, netValue: isRest ? round2(total - invoiced) : round2((total * percent) / 100) };
    });

    const workIds = [...new Set(input.workIds ?? [])];
    const works = workIds.length
      ? await this.prisma.project_work_types.findMany({
          where: { id: { in: workIds }, project_id: projectId, deleted_at: null },
          select: { id: true, name: true, milestone_id: true },
        })
      : [];
    if (works.length !== workIds.length) throw new BadRequestException('Nieznana robota');
    const outside = works.find((w) => !w.milestone_id || !milestoneIds.includes(w.milestone_id));
    if (outside) throw new BadRequestException(`Robota „${outside.name}” nie należy do wybranych etapów`);
    const alreadyClosed = await this.prisma.invoice_works.findFirst({
      where: { work_type_id: { in: workIds } },
      include: { project_work_types: { select: { name: true } } },
    });
    if (alreadyClosed) {
      throw new ConflictException(`Robota „${alreadyClosed.project_work_types.name}” jest już zamknięta innym protokołem`);
    }

    const issuedDate = input.issuedDate ? new Date(input.issuedDate) : new Date();
    const numbers = lines.map((l) => l.milestone.milestone_no).sort(naturalNo);
    const ext = file.originalname.includes('.') ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '';
    const driveName = `${project.name} – protokół ${toDate(issuedDate)} – ${numbers.join(', ')}${ext}`;
    const fileId = await this.storage.upload(file, driveName);

    let invoiceId: string;
    try {
      invoiceId = await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.invoices.create({
          data: {
            project_id: projectId,
            status: 'OCZEKUJE',
            issued_date: issuedDate,
            note: input.note?.trim() ?? '',
            protocol_file_id: fileId,
            protocol_file_name: file.originalname.slice(0, 255),
            protocol_mime_type: file.mimetype,
            created_by: userId,
          },
        });
        await tx.milestones_invoices.createMany({
          data: lines.map((l) => ({
            milestone_id: l.milestone.id,
            invoice_id: invoice.id,
            percent: l.percent,
            net_value: l.netValue,
            status: 'OCZEKUJE',
            issued_date: issuedDate,
            note: input.note?.trim() ?? '',
          })),
        });
        if (workIds.length) {
          await tx.invoice_works.createMany({
            data: workIds.map((work_type_id) => ({ invoice_id: invoice.id, work_type_id })),
          });
        }
        return invoice.id;
      });
    } catch (error) {
      await this.storage.remove(fileId);
      throw error;
    }

    const created = await this.get(invoiceId);
    this.notifyFinance(created, project, userId).catch((error) =>
      this.logger.error('Failed to notify financial directors about invoice request', error as Error),
    );
    return this.map(created);
  }

  async update(id: string, input: UpdateInvoiceInput) {
    const invoice = await this.get(id);
    const status = input.status ?? invoice.status;
    if (!STATUSES.includes(status) && !PAID_STATUSES.includes(status)) {
      throw new BadRequestException('Nieprawidłowy status');
    }
    const link = input.link === undefined ? invoice.link : input.link?.trim() || null;
    const invoiceNumber =
      input.invoiceNumber === undefined ? invoice.invoice_number : input.invoiceNumber?.trim() || null;
    if (status !== 'OCZEKUJE' && (!link || !invoiceNumber)) {
      throw new BadRequestException('Wystawiona lub zapłacona faktura wymaga numeru i linku');
    }
    const isPaid = PAID_STATUSES.includes(status);
    const shared = {
      invoice_number: invoiceNumber,
      status,
      link,
      issued_date:
        input.issuedDate === undefined ? invoice.issued_date : input.issuedDate ? new Date(input.issuedDate) : null,
      paid_at: isPaid ? (invoice.paid_at ?? new Date()) : null,
      note: input.note === undefined ? invoice.note : input.note.trim(),
    };

    // The per-milestone rows mirror the invoice so milestone totals and the dashboard stay correct
    await this.prisma.$transaction([
      this.prisma.invoices.update({ where: { id }, data: shared }),
      this.prisma.milestones_invoices.updateMany({ where: { invoice_id: id }, data: shared }),
    ]);
    return this.map(await this.get(id));
  }

  async remove(id: string) {
    const invoice = await this.get(id);
    await this.prisma.invoices.delete({ where: { id } });
    if (invoice.protocol_file_id) await this.storage.remove(invoice.protocol_file_id);
    return { success: true };
  }

  async protocol(id: string) {
    const invoice = await this.get(id);
    if (!invoice.protocol_file_id) throw new NotFoundException('Brak protokołu');
    return {
      stream: await this.storage.download(invoice.protocol_file_id),
      fileName: invoice.protocol_file_name ?? 'protokol',
      mimeType: invoice.protocol_mime_type ?? 'application/octet-stream',
    };
  }

  private readonly include = {
    author: { select: { firstName: true, lastName: true } },
    milestones_invoices: {
      select: {
        id: true,
        percent: true,
        net_value: true,
        milestones: { select: { id: true, milestone_no: true, description: true, type: true } },
      },
    },
    invoice_works: {
      select: {
        project_work_types: {
          select: { id: true, name: true, unit: true, total_quantity: true, milestone_id: true },
        },
      },
    },
  } as const;

  private map(r: Awaited<ReturnType<InvoicesService['get']>>) {
    const allocations = r.milestones_invoices
      .map((a) => ({
        rowId: a.id,
        milestoneId: a.milestones.id,
        milestoneNo: a.milestones.milestone_no,
        description: a.milestones.description,
        type: a.milestones.type,
        percent: a.percent != null ? Number(a.percent) : null,
        netValue: Number(a.net_value),
      }))
      .sort((a, b) => naturalNo(a.milestoneNo, b.milestoneNo));
    return {
      id: r.id,
      projectId: r.project_id,
      invoiceNumber: r.invoice_number,
      status: r.status,
      issuedDate: toDate(r.issued_date),
      paidAt: toDate(r.paid_at),
      link: r.link,
      note: r.note,
      totalNet: round2(allocations.reduce((s, a) => s + a.netValue, 0)),
      createdAt: r.created_at,
      createdBy: r.author ? `${r.author.firstName ?? ''} ${r.author.lastName ?? ''}`.trim() : null,
      protocol: r.protocol_file_id
        ? { fileName: r.protocol_file_name ?? 'protokol', mimeType: r.protocol_mime_type }
        : null,
      allocations,
      works: r.invoice_works.map((w) => ({
        id: w.project_work_types.id,
        name: w.project_work_types.name,
        unit: w.project_work_types.unit,
        totalQuantity: w.project_work_types.total_quantity != null ? Number(w.project_work_types.total_quantity) : null,
        milestoneId: w.project_work_types.milestone_id,
      })),
    };
  }

  private async notifyFinance(
    invoice: Awaited<ReturnType<InvoicesService['get']>>,
    project: { id: string; name: string; currency: string | null },
    userId: number,
  ) {
    const [recipients, requester] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true, roles: { has: 'financial_director' } },
        select: { email: true, firstName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, position: true },
      }),
    ]);
    if (recipients.length === 0) return;

    const currency = project.currency || 'PLN';
    const money = (n: number) =>
      `${new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }).format(n)} ${currency}`;
    const mapped = this.map(invoice);
    const requestedBy = requester
      ? [`${requester.firstName ?? ''} ${requester.lastName ?? ''}`.trim(), requester.position].filter(Boolean).join(', ')
      : 'Kierownik projektu';
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').split(',')[0].trim();

    await Promise.all(
      recipients.map((r) =>
        this.mail.sendInvoiceRequestEmail(r.email, r.firstName, {
          projectName: project.name,
          milestoneNo: mapped.allocations.map((a) => a.milestoneNo).join(', '),
          milestoneDescription: 'protokół odbioru robót',
          netValue: money(mapped.totalNet),
          requestedBy,
          issuedDate: mapped.issuedDate ? mapped.issuedDate.split('-').reverse().join('.') : null,
          note: mapped.note || null,
          invoicesUrl: `${frontendUrl}/projects/${project.id}/milestones`,
          breakdown: mapped.allocations.map(
            (a) => `${a.milestoneNo} – ${money(a.netValue)}${a.percent != null ? ` (${a.percent}%)` : ''}`,
          ),
          works: mapped.works.map((w) => w.name),
        }),
      ),
    );
  }
}
