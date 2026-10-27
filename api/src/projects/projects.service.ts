import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { CreateResourcePlanDto } from './dto/create-resource-plan.dto';
import { CreateMilestoneInvoiceDto } from './dto/create-milestone-invoice.dto';
import { PlannedExpensesService } from '../planned-expenses/planned-expenses.service';
import { MailService } from '../mail/mail.service';
function sanitizeDecimals(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(obj, (_key, value: unknown) => {
      if (typeof value === 'bigint') return Number(value);
      return value;
    }),
  ) as Record<string, unknown>;
}

const PAID_INVOICE_STATUSES = ['ZAPŁACONE', 'ZAPŁACONA'];

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('projects-sync') private readonly syncQueue: Queue,
    private readonly config: ConfigService,
    private readonly sheetsService: GoogleSheetsService,
    private readonly plannedExpensesService: PlannedExpensesService,
    private readonly mailService: MailService,
  ) { }

  private async handleSyncError(sheetName: string, action: string, error: unknown, syncData: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    
    // Try to log to Postgres
    try {
      await this.prisma.google_sheets_sync_errors.create({
        data: {
          table_name: sheetName,
          action: action,
          error_message: errMsg,
          payload: JSON.stringify(syncData),
        }
      });
    } catch (dbErr) {}

    // Send email
    await this.mailService.sendSyncErrorEmail(
      sheetName,
      action,
      errMsg,
      JSON.stringify(syncData, null, 2)
    );
  }

  async list() {
    const rows = await this.prisma.projects.findMany({
      where: { deleted_at: null },
      include: {
        gathering_points: {
          where: { deleted_at: null },
          orderBy: { created_at: 'asc' },
          select: { id: true, name: true, latitude: true, longitude: true },
        },
        contractors: { select: { id: true, name: true } },
        project_types: { select: { id: true, name: true, code: true } },
        users_projects_manager_idTousers: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      country: p.country,
      city: p.city,
      start_date_contract:
        p.start_date_contract?.toISOString().split('T')[0] ?? null,
      end_date_contract:
        p.end_date_contract?.toISOString().split('T')[0] ?? null,
      start_date_fact: p.start_date_fact?.toISOString().split('T')[0] ?? null,
      end_date_fact: p.end_date_fact?.toISOString().split('T')[0] ?? null,
      contract_net_value: p.contract_net_value?.toString() ?? null,
      currency: p.currency,
      created_at: p.created_at,
      updated_at: p.updated_at,
      contractors: p.contractors
        ? { id: p.contractors.id, name: p.contractors.name }
        : null,
      project_types: p.project_types
        ? {
          id: Number(p.project_types.id),
          name: p.project_types.name,
          code: p.project_types.code,
        }
        : null,
      manager: p.users_projects_manager_idTousers
        ? {
          id: p.users_projects_manager_idTousers.id,
          firstName: p.users_projects_manager_idTousers.firstName,
          lastName: p.users_projects_manager_idTousers.lastName,
        }
        : null,
      dokumentationUrl: p.dokumentation_url,
      pinUrl: p.pin_url,
      latitude: p.latitude != null ? Number(p.latitude) : null,
      longitude: p.longitude != null ? Number(p.longitude) : null,
      power: p.power ? Number(p.power) : null,
      warrantyPercent: p.warranty_percent ? Number(p.warranty_percent) : null,
      gatheringPoints: p.gathering_points.map((g) => ({
        id: g.id,
        name: g.name,
        latitude: Number(g.latitude),
        longitude: Number(g.longitude),
      })),
    }));
  }

  private async ensureCurrencyExists(currencyCode?: string | null) {
    if (!currencyCode) return;
    await this.prisma.currencies.upsert({
      where: { code: currencyCode },
      update: {},
      create: {
        code: currencyCode,
        name: currencyCode,
        symbol:
          currencyCode === 'PLN' ? 'zł' : currencyCode === 'EUR' ? '€' : '$',
      },
    });
  }

  private async ensureProjectTypeExists(
    projectTypeId?: number | bigint | null,
  ): Promise<bigint> {
    const defaultTypes = [
      {
        code: 'PV',
        name: 'Fotowoltaika (PV)',
        description: 'Instalacje i farmy fotowoltaiczne',
      },
      {
        code: 'MAGAZYN_ENERGII',
        name: 'Magazyn energii',
        description: 'Systemy magazynowania energii (BESS)',
      },
    ];

    if (projectTypeId) {
      const existing = await this.prisma.project_types.findUnique({
        where: { id: BigInt(projectTypeId) },
      });
      if (existing) return existing.id;
    }

    let firstId: bigint | null = null;
    for (const pt of defaultTypes) {
      const row = await this.prisma.project_types.upsert({
        where: { code: pt.code },
        update: {},
        create: pt,
      });
      if (!firstId) firstId = row.id;
    }

    return firstId ?? 1n;
  }

  async create(dto: CreateProjectDto) {
    if (dto.currency) {
      await this.ensureCurrencyExists(dto.currency);
    }
    const projectTypeId = await this.ensureProjectTypeExists(dto.projectTypeId);

    const projectId = randomUUID();

    const contractor = await this.prisma.contractors.findUnique({ where: { id: dto.contractorId } });
    const pType = await this.prisma.project_types.findUnique({ where: { id: projectTypeId } });
    let managerName = '';
    let managerEmail = '';
    let managerFirstName = '';
    if (dto.managerId) {
      const manager = await this.prisma.user.findUnique({ where: { id: dto.managerId } });
      if (manager) {
        managerName = `${manager.firstName} ${manager.lastName}`;
        managerEmail = manager.email;
        managerFirstName = manager.firstName;
      }
    }

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.getOrThrow<string>('PROJECTS_SHEET_NAME');

    const project = await this.prisma.projects.create({
      data: {
        id: projectId,
        name: dto.name,
        contractors: { connect: { id: dto.contractorId } },
        project_types: { connect: { id: projectTypeId } },
        country: dto.country,
        city: dto.city,
        status: dto.status ?? 'DRAFT',
        currencies: dto.currency
          ? { connect: { code: dto.currency } }
          : undefined,
        contract_net_value: dto.contractNetValue ?? null,
        start_date_contract: dto.startDateContract
          ? new Date(dto.startDateContract)
          : null,
        end_date_contract: dto.endDateContract
          ? new Date(dto.endDateContract)
          : null,
        start_date_fact: dto.startDateFact ? new Date(dto.startDateFact) : null,
        end_date_fact: dto.endDateFact ? new Date(dto.endDateFact) : null,
        users_projects_manager_idTousers: dto.managerId
          ? { connect: { id: dto.managerId } }
          : undefined,
        dokumentation_url: dto.dokumentationUrl ?? null,
        pin_url: dto.pinUrl ?? null,
        latitude: dto.latitude,
        longitude: dto.longitude,
        gathering_points: dto.gatheringPoints?.length
          ? {
              create: dto.gatheringPoints.map((g) => ({
                name: g.name.trim(),
                latitude: g.latitude,
                longitude: g.longitude,
              })),
            }
          : undefined,
        power: dto.power ?? null,
        warranty_percent: dto.warrantyPercent ?? null,
      },
      include: {
        contractors: { select: { id: true, name: true } },
        project_types: { select: { id: true, name: true, code: true } },
        users_projects_manager_idTousers: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Sync to Google Sheets asynchronously
    await this.syncQueue.add('sync', {
      projectId: project.id,
      action: 'create',
    });

    let defaultCostCategory = await this.prisma.cost_categories.findFirst({
      where: { name: 'Wypłata' },
    });

    if (!defaultCostCategory) {
      defaultCostCategory = await this.prisma.cost_categories.create({
        data: { name: 'Wypłata', is_salary: true },
      });
    }

    await this.plannedExpensesService.create(project.id, {
      costCategoryId: defaultCostCategory.id.toString(),
      plannedPercent: 100,
    });

    if (managerEmail) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
      const projectUrl = `${frontendUrl}/projects/${project.id}`;
      this.mailService.sendProjectAssignmentEmail(managerEmail, managerFirstName, project.name, projectUrl).catch(() => {});
    }

    return sanitizeDecimals({
      id: project.id,
      name: project.name,
      status: project.status,
      country: project.country,
      city: project.city,
      start_date_contract:
        project.start_date_contract?.toISOString().split('T')[0] ?? null,
      end_date_contract:
        project.end_date_contract?.toISOString().split('T')[0] ?? null,
      start_date_fact:
        project.start_date_fact?.toISOString().split('T')[0] ?? null,
      end_date_fact: project.end_date_fact?.toISOString().split('T')[0] ?? null,
      contract_net_value: project.contract_net_value?.toString() ?? null,
      currency: project.currency,
      contractors: project.contractors,
      project_types: project.project_types
        ? {
          id: Number(project.project_types.id),
          name: project.project_types.name,
          code: project.project_types.code,
        }
        : null,
      manager: project.users_projects_manager_idTousers
        ? {
          id: project.users_projects_manager_idTousers.id,
          firstName: project.users_projects_manager_idTousers.firstName,
          lastName: project.users_projects_manager_idTousers.lastName,
        }
        : null,
      dokumentationUrl: project.dokumentation_url,
      pinUrl: project.pin_url,
      latitude: project.latitude != null ? Number(project.latitude) : null,
      longitude: project.longitude != null ? Number(project.longitude) : null,
      power: project.power ? Number(project.power) : null,
      warrantyPercent: project.warranty_percent ? Number(project.warranty_percent) : null,
    });
  }

  async listContractors() {
    return this.prisma.contractors.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async listProjectTypes() {
    await this.ensureProjectTypeExists(null);
    const rows = await this.prisma.project_types.findMany({
      where: {
        code: { in: ['PV', 'MAGAZYN_ENERGII'] },
      },
      select: { id: true, name: true, code: true },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => ({ id: Number(r.id), name: r.name, code: r.code }));
  }

  async update(id: string, dto: UpdateProjectDto) {
    if (dto.currency) {
      await this.ensureCurrencyExists(dto.currency);
    }
    const projectTypeId = dto.projectTypeId
      ? await this.ensureProjectTypeExists(dto.projectTypeId)
      : undefined;

    const existing = await this.prisma.projects.findUnique({
      where: { id },
      include: {
        contractors: true,
        project_types: true,
        users_projects_manager_idTousers: true,
      }
    });
    if (!existing) throw new NotFoundException('Project not found');

    const contractorName = dto.contractorId
      ? (await this.prisma.contractors.findUnique({ where: { id: dto.contractorId } }))?.name
      : existing.contractors?.name;

    const pTypeName = projectTypeId
      ? (await this.prisma.project_types.findUnique({ where: { id: projectTypeId } }))?.name
      : existing.project_types?.name;

    let managerName = existing.users_projects_manager_idTousers
      ? `${existing.users_projects_manager_idTousers.firstName} ${existing.users_projects_manager_idTousers.lastName}`
      : '';
    let managerEmail = '';
    let managerFirstName = '';
    if (dto.managerId !== undefined) {
      if (dto.managerId === null) managerName = '';
      else {
        const manager = await this.prisma.user.findUnique({ where: { id: dto.managerId } });
        if (manager) {
          managerName = `${manager.firstName} ${manager.lastName}`;
          if (existing.users_projects_manager_idTousers?.id !== dto.managerId) {
            managerEmail = manager.email;
            managerFirstName = manager.firstName;
          }
        }
      }
    }

    const syncData = {
      id: id,
      contractor: contractorName ?? '',
      project: dto.name ?? existing.name,
      location: dto.city || dto.country ? `${dto.city ?? existing.city}, ${dto.country ?? existing.country}` : (existing.city ? `${existing.city}, ${existing.country}` : existing.country ?? ''),
      dateFrom: dto.startDateContract !== undefined ? (dto.startDateContract ? dto.startDateContract.split('T')[0] : '') : (existing.start_date_contract ? existing.start_date_contract.toISOString().split('T')[0] : ''),
      dateTo: dto.endDateContract !== undefined ? (dto.endDateContract ? dto.endDateContract.split('T')[0] : '') : (existing.end_date_contract ? existing.end_date_contract.toISOString().split('T')[0] : ''),
      projectType: pTypeName ?? '',
      pin: dto.pinUrl !== undefined ? (dto.pinUrl ?? '') : (existing.pin_url ?? ''),
      manager: managerName,
      power: dto.power !== undefined ? (dto.power ?? '') : (existing.power ? Number(existing.power) : ''),
      dokumentationUrl: dto.dokumentationUrl !== undefined ? (dto.dokumentationUrl ?? '') : (existing.dokumentation_url ?? ''),
      country: dto.country ?? existing.country ?? '',
      status: dto.status ?? existing.status ?? 'DRAFT',
      dateFromFact: dto.startDateFact !== undefined ? (dto.startDateFact ? dto.startDateFact.split('T')[0] : '') : (existing.start_date_fact ? existing.start_date_fact.toISOString().split('T')[0] : ''),
      dateToFact: dto.endDateFact !== undefined ? (dto.endDateFact ? dto.endDateFact.split('T')[0] : '') : (existing.end_date_fact ? existing.end_date_fact.toISOString().split('T')[0] : ''),
      warrantyPercent: dto.warrantyPercent !== undefined ? (dto.warrantyPercent ?? '') : (existing.warranty_percent ? Number(existing.warranty_percent) : ''),
    };

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.getOrThrow<string>('PROJECTS_SHEET_NAME');

    try {
      const rowIndex = await this.sheetsService.findRowIndexById(spreadsheetId, sheetName, id);
      if (rowIndex) {
        await this.sheetsService.updateRow(spreadsheetId, sheetName, rowIndex, syncData);
      } else {
        await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
      }
    } catch (error) {
      await this.handleSyncError(sheetName, 'UPDATE_PROJECT', error, syncData);
    }

    const project = await this.prisma.projects.update({
      where: { id },
      data: {
        name: dto.name,
        contractors: dto.contractorId
          ? { connect: { id: dto.contractorId } }
          : undefined,
        project_types: projectTypeId
          ? { connect: { id: projectTypeId } }
          : undefined,
        country: dto.country,
        city: dto.city,
        status: dto.status,
        currencies: dto.currency
          ? { connect: { code: dto.currency } }
          : { disconnect: true },
        contract_net_value: dto.contractNetValue ?? null,
        start_date_contract: dto.startDateContract
          ? new Date(dto.startDateContract)
          : null,
        end_date_contract: dto.endDateContract
          ? new Date(dto.endDateContract)
          : null,
        start_date_fact: dto.startDateFact ? new Date(dto.startDateFact) : null,
        end_date_fact: dto.endDateFact ? new Date(dto.endDateFact) : null,
        users_projects_manager_idTousers: dto.managerId
          ? { connect: { id: dto.managerId } }
          : { disconnect: true },
        dokumentation_url: dto.dokumentationUrl,
        pin_url: dto.pinUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        // The sent list replaces the saved one: removed points are soft-deleted, the rest updated or added
        gathering_points: dto.gatheringPoints
          ? {
              updateMany: {
                where: {
                  deleted_at: null,
                  id: { notIn: dto.gatheringPoints.flatMap((g) => (g.id ? [g.id] : [])) },
                },
                data: { deleted_at: new Date() },
              },
              update: dto.gatheringPoints
                .filter((g) => g.id)
                .map((g) => ({
                  where: { id: g.id },
                  data: { name: g.name.trim(), latitude: g.latitude, longitude: g.longitude, deleted_at: null },
                })),
              create: dto.gatheringPoints
                .filter((g) => !g.id)
                .map((g) => ({ name: g.name.trim(), latitude: g.latitude, longitude: g.longitude })),
            }
          : undefined,
        power: dto.power ?? null,
        warranty_percent: dto.warrantyPercent ?? null,
      },
      include: {
        contractors: { select: { id: true, name: true } },
        project_types: { select: { id: true, name: true, code: true } },
        users_projects_manager_idTousers: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (managerEmail) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
      const projectUrl = `${frontendUrl}/projects/${project.id}`;
      this.mailService.sendProjectAssignmentEmail(managerEmail, managerFirstName, project.name, projectUrl).catch(() => {});
    }

    return sanitizeDecimals({
      id: project.id,
      name: project.name,
      status: project.status,
      country: project.country,
      city: project.city,
      start_date_contract:
        project.start_date_contract?.toISOString().split('T')[0] ?? null,
      end_date_contract:
        project.end_date_contract?.toISOString().split('T')[0] ?? null,
      start_date_fact:
        project.start_date_fact?.toISOString().split('T')[0] ?? null,
      end_date_fact: project.end_date_fact?.toISOString().split('T')[0] ?? null,
      contract_net_value: project.contract_net_value?.toString() ?? null,
      currency: project.currency,
      contractors: project.contractors,
      project_types: project.project_types
        ? {
          id: Number(project.project_types.id),
          name: project.project_types.name,
          code: project.project_types.code,
        }
        : null,
      manager: project.users_projects_manager_idTousers
        ? {
          id: project.users_projects_manager_idTousers.id,
          firstName: project.users_projects_manager_idTousers.firstName,
          lastName: project.users_projects_manager_idTousers.lastName,
        }
        : null,
      dokumentationUrl: project.dokumentation_url,
      pinUrl: project.pin_url,
      latitude: project.latitude != null ? Number(project.latitude) : null,
      longitude: project.longitude != null ? Number(project.longitude) : null,
      power: project.power ? Number(project.power) : null,
      warrantyPercent: project.warranty_percent ? Number(project.warranty_percent) : null,
    });
  }

  async delete(id: string) {
    await this.prisma.projects.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { success: true };
  }

  // --- Milestones ---

  async listMilestones(projectId: string) {
    const rows = await this.prisma.milestones.findMany({
      where: { project_id: projectId, deleted_at: null },
      include: {
        milestones_invoices: {
          orderBy: { issued_date: 'asc' }
        }
      },
    });

    // Natural order: contract milestones first (KM 1, KM 2 … KM 10), then additional works (RD 1, RD 2 …)
    rows.sort(
      (a, b) =>
        Number(a.type === 'roboty_dodatkowe') - Number(b.type === 'roboty_dodatkowe') ||
        a.milestone_no.localeCompare(b.milestone_no, 'pl', { numeric: true }),
    );

    return rows.map((m) => ({
      id: m.id,
      projectId: m.project_id,
      milestoneNo: m.milestone_no,
      description: m.description,
      type: m.type ?? 'KM',
      percentage: m.percentage ? Number(m.percentage) : 0,
      netAmount: m.net_amount ? Number(m.net_amount) : 0,
      invoicingPercentage: m.invoicing_percentage
        ? Number(m.invoicing_percentage)
        : null,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      invoices: m.milestones_invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        netValue: Number(inv.net_value),
        note: inv.note,
        issuedDate: inv.issued_date?.toISOString().split('T')[0] ?? null,
        paidAt: inv.paid_at?.toISOString().split('T')[0] ?? null,
        status: inv.status,
        link: inv.link,
        invoiceId: inv.invoice_id,
        percent: inv.percent != null ? Number(inv.percent) : null,
      }))
    }));
  }

  async createMilestone(projectId: string, dto: CreateMilestoneDto) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestoneType = dto.type ?? 'KM';
    let percentage = 0;
    let netAmount = 0;

    if (milestoneType === 'KM') {
      // Validate percentage sum for KM type
      const existing = await this.prisma.milestones.findMany({
        where: { project_id: projectId, deleted_at: null },
      });
      const currentSum = existing.reduce(
        (sum, m) => sum + Number(m.percentage ?? 0),
        0,
      );
      percentage = dto.percentage ?? 0;
      if (currentSum + percentage > 100) {
        throw new BadRequestException(
          'Suma procentów kamieni milowych nie może przekraczać 100%',
        );
      }
      // Calculate net amount based on project budget
      const projectBudget = project.contract_net_value
        ? Number(project.contract_net_value)
        : 0;
      netAmount = (projectBudget * percentage) / 100;
    } else {
      // roboty_dodatkowe: manual net amount, percentage = 0
      percentage = 0;
      netAmount = dto.netAmount ?? 0;
    }

    const row = await this.prisma.milestones.create({
      data: {
        project_id: projectId,
        milestone_no: dto.milestoneNo,
        description: dto.description,
        type: milestoneType,
        percentage,
        net_amount: netAmount,
        invoicing_percentage: dto.invoicingPercentage ?? null,
      },
    });

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('MILESTONES_SHEET_NAME', 'KamienieMilowe');

    const syncData = {
      id: row.id,
      projectId: project.id,
      projectName: project.name,
      milestoneNo: row.milestone_no,
      type: row.type,
      description: row.description ?? '',
      percentage: Number(row.percentage),
      netAmount: Number(row.net_amount),
    };

    try {
      await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
    } catch (error) {
      await this.handleSyncError(sheetName, 'CREATE_MILESTONE', error, syncData);
    }

    return {
      id: row.id,
      projectId: row.project_id,
      milestoneNo: row.milestone_no,
      description: row.description,
      type: row.type,
      percentage: Number(row.percentage),
      netAmount: Number(row.net_amount),
      invoicingPercentage: row.invoicing_percentage
        ? Number(row.invoicing_percentage)
        : null,
    };
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestones.findUnique({
      where: { id, deleted_at: null },
    });
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const milestoneType = dto.type ?? milestone.type ?? 'KM';
    let netAmount: number | undefined = undefined;
    let percentage: number | undefined = dto.percentage;

    if (milestoneType === 'KM') {
      if (dto.percentage !== undefined) {
        // Validate percentage sum excluding current milestone
        const existing = await this.prisma.milestones.findMany({
          where: {
            project_id: milestone.project_id,
            deleted_at: null,
            NOT: { id },
          },
        });
        const currentSum = existing.reduce(
          (sum, m) => sum + Number(m.percentage ?? 0),
          0,
        );
        if (currentSum + dto.percentage > 100) {
          throw new BadRequestException(
            'Suma procentów kamieni milowych nie może przekraczać 100%',
          );
        }
        // Fetch project budget to update net amount
        const project = await this.prisma.projects.findUnique({
          where: { id: milestone.project_id },
        });
        const projectBudget = project?.contract_net_value
          ? Number(project.contract_net_value)
          : 0;
        netAmount = (projectBudget * dto.percentage) / 100;
      }
    } else {
      // roboty_dodatkowe: manual net amount, force percentage = 0
      percentage = 0;
      netAmount = dto.netAmount;
    }

    const row = await this.prisma.milestones.update({
      where: { id },
      data: {
        milestone_no: dto.milestoneNo,
        description: dto.description,
        type: milestoneType,
        percentage,
        net_amount: netAmount,
        invoicing_percentage: dto.invoicingPercentage,
      },
    });

    const project = await this.prisma.projects.findUnique({
      where: { id: row.project_id },
    });

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('MILESTONES_SHEET_NAME', 'KamienieMilowe');

    const syncData = {
      id: row.id,
      projectId: row.project_id,
      projectName: project?.name ?? '',
      milestoneNo: row.milestone_no,
      type: row.type,
      description: row.description ?? '',
      percentage: Number(row.percentage),
      netAmount: Number(row.net_amount),
    };

    try {
      const rowIndex = await this.sheetsService.findRowIndexById(spreadsheetId, sheetName, row.id);
      if (rowIndex) {
        await this.sheetsService.updateRow(spreadsheetId, sheetName, rowIndex, syncData);
      } else {
        await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
      }
    } catch (error) {
      await this.handleSyncError(sheetName, 'UPDATE_MILESTONE', error, syncData);
    }

    return {
      id: row.id,
      projectId: row.project_id,
      milestoneNo: row.milestone_no,
      description: row.description,
      type: row.type,
      percentage: Number(row.percentage),
      netAmount: Number(row.net_amount),
      invoicingPercentage: row.invoicing_percentage
        ? Number(row.invoicing_percentage)
        : null,
    };
  }

  async deleteMilestone(id: string) {
    const milestone = await this.prisma.milestones.findUnique({
      where: { id, deleted_at: null },
    });
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    await this.prisma.milestones.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { success: true };
  }

  // --- Milestone Invoices ---

  async createMilestoneInvoice(
    milestoneId: string,
    dto: CreateMilestoneInvoiceDto,
    requesterId: number | null = null,
  ) {
    const milestone = await this.prisma.milestones.findUnique({
      where: { id: milestoneId, deleted_at: null },
    });
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const status = dto.status || 'OCZEKUJE';
    const invoice = await this.prisma.milestones_invoices.create({
      data: {
        milestone_id: milestoneId,
        invoice_number: dto.invoiceNumber || null,
        net_value: dto.netValue,
        issued_date: dto.issuedDate ? new Date(dto.issuedDate) : null,
        // Only a paid invoice has a payment date
        paid_at: PAID_INVOICE_STATUSES.includes(status) ? new Date() : null,
        note: dto.note ?? '',
        status,
        link: dto.link || null,
      }
    });

    // A new invoice awaiting acceptance is a request from the project manager — notify finance
    if (invoice.status === 'OCZEKUJE') {
      this.notifyFinancialDirectorsAboutInvoiceRequest(milestone, invoice, requesterId).catch((error) =>
        this.logger.error('Failed to notify financial directors about invoice request', error as Error),
      );
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      netValue: Number(invoice.net_value),
      note: invoice.note,
      issuedDate: invoice.issued_date?.toISOString().split('T')[0] ?? null,
      status: invoice.status,
      link: invoice.link,
    };
  }

  private async notifyFinancialDirectorsAboutInvoiceRequest(
    milestone: { project_id: string; milestone_no: string; description: string },
    invoice: { net_value: unknown; issued_date: Date | null; note: string },
    requesterId: number | null,
  ) {
    const [project, recipients, requester] = await Promise.all([
      this.prisma.projects.findUnique({
        where: { id: milestone.project_id },
        select: {
          id: true,
          name: true,
          currency: true,
          users_projects_manager_idTousers: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { isActive: true, roles: { has: 'financial_director' } },
        select: { email: true, firstName: true },
      }),
      requesterId
        ? this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { firstName: true, lastName: true, position: true },
          })
        : null,
    ]);

    if (!project || recipients.length === 0) return;

    // Prefer the logged-in author; fall back to the project manager
    const manager = project.users_projects_manager_idTousers;
    const requestedBy = requester
      ? [`${requester.firstName} ${requester.lastName}`.trim(), requester.position].filter(Boolean).join(', ')
      : manager
        ? `${manager.firstName} ${manager.lastName}`.trim()
        : 'Kierownik projektu';
    const netValue = `${new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: 'always',
    }).format(Number(invoice.net_value))} ${project.currency || 'PLN'}`;
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    await Promise.all(
      recipients.map((recipient) =>
        this.mailService.sendInvoiceRequestEmail(recipient.email, recipient.firstName, {
          projectName: project.name,
          milestoneNo: milestone.milestone_no,
          milestoneDescription: milestone.description,
          netValue,
          requestedBy,
          // Polish date format for the email, e.g. 22.10.2026
          issuedDate: invoice.issued_date
            ? invoice.issued_date.toISOString().split('T')[0].split('-').reverse().join('.')
            : null,
          note: invoice.note || null,
          invoicesUrl: `${frontendUrl}/projects/${project.id}/milestones`,
        }),
      ),
    );
  }

  async updateMilestoneInvoice(milestoneId: string, invoiceId: string, dto: CreateMilestoneInvoiceDto) {
    const invoice = await this.prisma.milestones_invoices.findUnique({
      where: { id: invoiceId, milestone_id: milestoneId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const status = dto.status ?? invoice.status;
    const isPaid = PAID_INVOICE_STATUSES.includes(status);
    const updated = await this.prisma.milestones_invoices.update({
      where: { id: invoiceId },
      data: {
        invoice_number: dto.invoiceNumber ?? invoice.invoice_number,
        net_value: dto.netValue ?? invoice.net_value,
        note: dto.note ?? invoice.note,
        issued_date: dto.issuedDate ? new Date(dto.issuedDate) : invoice.issued_date,
        // Payment date follows the status: set when it becomes paid, cleared when it no longer is
        paid_at: isPaid ? (invoice.paid_at ?? new Date()) : null,
        status,
        link: dto.link ?? invoice.link,
      }
    });

    return {
      id: updated.id,
      invoiceNumber: updated.invoice_number,
      netValue: Number(updated.net_value),
      note: updated.note,
      issuedDate: updated.issued_date?.toISOString().split('T')[0] ?? null,
      status: updated.status,
      link: updated.link,
    };
  }

  async deleteMilestoneInvoice(milestoneId: string, invoiceId: string) {
    const invoice = await this.prisma.milestones_invoices.findUnique({
      where: { id: invoiceId, milestone_id: milestoneId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    await this.prisma.milestones_invoices.delete({
      where: { id: invoiceId },
    });

    return { success: true };
  }

  // --- Departments & Foremen Reference ---

  async listDepartments() {
    let list = await this.prisma.departments.findMany({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    if (list.length === 0) {
      const defaultDeps = [
        'Kafar',
        'Montaż',
        'Elektryka',
        'Maszyny budowlane',
        'Kable AC',
      ];
      await this.prisma.departments.createMany({
        data: defaultDeps.map((name) => ({ name })),
      });
      list = await this.prisma.departments.findMany({
        where: { is_active: true },
        orderBy: { id: 'asc' },
      });
    }
    return list.map((d) => ({ id: Number(d.id), name: d.name }));
  }

  async listForemen() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, roles: true },
    });
    return users
      .filter((u) =>
        u.roles.some(
          (r) =>
            r.toLowerCase() === 'foreman' || r.toLowerCase() === 'st. brygadzista',
        ),
      )
      .map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      }));
  }

  // --- Work Types ---

  async listWorkTypes(projectId: string) {
    const rows = await this.prisma.project_work_types.findMany({
      where: { project_id: projectId, deleted_at: null },
      include: {
        milestones: { select: { id: true, milestone_no: true } },
        departments: { select: { id: true, name: true } },
        daily_reports: { select: { actual_quantity: true }, where: { deleted_at: null } },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((w) => {
      const actualQuantity = w.daily_reports.reduce((sum, dr) => sum + (dr.actual_quantity ? Number(dr.actual_quantity) : 0), 0);
      
      return {
        id: w.id,
        projectId: w.project_id,
        milestoneId: w.milestone_id,
        milestoneNo: w.milestones?.milestone_no ?? '',
        departmentId: Number(w.department_id),
        departmentName: w.departments?.name ?? '',
        name: w.name,
        unit: w.unit,
        percentage: w.percentage ? Number(w.percentage) : null,
        totalQuantity: w.total_quantity ? Number(w.total_quantity) : 0,
        actualQuantity,
        plannedStart: w.planned_start
          ? w.planned_start.toISOString().split('T')[0]
          : null,
        plannedEnd: w.planned_end
          ? w.planned_end.toISOString().split('T')[0]
          : null,
      };
    });
  }

  async listWorkTypeDailyReports(workTypeId: string) {
    const reports = await this.prisma.daily_reports.findMany({
      where: { work_type_id: workTypeId, deleted_at: null },
      orderBy: { report_date: 'desc' },
      select: {
        id: true,
        report_date: true,
        actual_quantity: true,
        actual_workers: true,
        actual_hours: true,
      },
    });

    return reports.map((r) => ({
      id: r.id,
      date: r.report_date.toISOString().split('T')[0],
      quantity: r.actual_quantity ? Number(r.actual_quantity) : 0,
      workers: r.actual_workers ?? null,
      hours: r.actual_hours ? Number(r.actual_hours) : null,
    }));
  }

  async createWorkType(projectId: string, dto: CreateWorkTypeDto) {
    const row = await this.prisma.project_work_types.create({
      data: {
        project_id: projectId,
        milestone_id: dto.milestoneId ?? null,
        department_id: BigInt(dto.departmentId),
        name: dto.name,
        unit: dto.unit ?? null,
        percentage: dto.percentage ?? null,
        total_quantity: dto.totalQuantity ?? null,
        planned_start: dto.plannedStart ? new Date(dto.plannedStart) : null,
        planned_end: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
      },
      include: {
        projects: { select: { name: true } },
        milestones: { select: { milestone_no: true, type: true } },
        departments: { select: { name: true } },
      },
    });

    // Works on additional works (RD) get 1% of the hours plan by default
    if (row.milestones?.type === 'roboty_dodatkowe') {
      await this.prisma.work_type_hours_distribution.create({
        data: { project_id: projectId, work_type_id: row.id, percentage: 1 },
      });
    }

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('WORK_TYPES_SHEET_NAME', 'RodzajeRobot');

    const syncData = {
      id: row.id,
      projectId: row.project_id,
      projectName: row.projects?.name ?? '',
      milestoneId: row.milestone_id ?? '',
      milestoneNo: row.milestones?.milestone_no ?? '',
      departmentId: Number(row.department_id),
      departmentName: row.departments?.name ?? '',
      jobType: row.name,
      unit: row.unit ?? '',
      totalQuantity: row.total_quantity ? Number(row.total_quantity) : 0,
      percentage: row.percentage ? Number(row.percentage) : '',
      plannedStart: row.planned_start ? row.planned_start.toISOString().split('T')[0] : '',
      plannedEnd: row.planned_end ? row.planned_end.toISOString().split('T')[0] : '',
    };

    try {
      await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
    } catch (error) {
      await this.handleSyncError(sheetName, 'CREATE_WORK_TYPE', error, syncData);
    }

    return {
      id: row.id,
      projectId: row.project_id,
      milestoneId: row.milestone_id,
      departmentId: Number(row.department_id),
      name: row.name,
      unit: row.unit,
      percentage: row.percentage ? Number(row.percentage) : null,
      totalQuantity: row.total_quantity ? Number(row.total_quantity) : 0,
    };
  }

  async updateWorkType(id: string, dto: Partial<CreateWorkTypeDto>) {
    const row = await this.prisma.project_work_types.update({
      where: { id },
      data: {
        milestone_id: dto.milestoneId,
        department_id: dto.departmentId ? BigInt(dto.departmentId) : undefined,
        name: dto.name,
        unit: dto.unit,
        percentage: dto.percentage !== undefined ? dto.percentage : undefined,
        total_quantity: dto.totalQuantity,
        planned_start: dto.plannedStart
          ? new Date(dto.plannedStart)
          : undefined,
        planned_end: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
      },
      include: {
        projects: { select: { name: true } },
        milestones: { select: { milestone_no: true } },
        departments: { select: { name: true } },
      },
    });

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('WORK_TYPES_SHEET_NAME', 'RodzajeRobot');

    const syncData = {
      id: row.id,
      projectId: row.project_id,
      projectName: row.projects?.name ?? '',
      milestoneId: row.milestone_id ?? '',
      milestoneNo: row.milestones?.milestone_no ?? '',
      departmentId: Number(row.department_id),
      departmentName: row.departments?.name ?? '',
      jobType: row.name,
      unit: row.unit ?? '',
      totalQuantity: row.total_quantity ? Number(row.total_quantity) : 0,
      percentage: row.percentage ? Number(row.percentage) : '',
      plannedStart: row.planned_start ? row.planned_start.toISOString().split('T')[0] : '',
      plannedEnd: row.planned_end ? row.planned_end.toISOString().split('T')[0] : '',
    };

    try {
      const rowIndex = await this.sheetsService.findRowIndexById(spreadsheetId, sheetName, row.id);
      if (rowIndex) {
        await this.sheetsService.updateRow(spreadsheetId, sheetName, rowIndex, syncData);
      } else {
        await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
      }
    } catch (error) {
      await this.handleSyncError(sheetName, 'UPDATE_WORK_TYPE', error, syncData);
    }

    return {
      id: row.id,
      name: row.name,
      unit: row.unit,
      percentage: row.percentage ? Number(row.percentage) : null,
      totalQuantity: row.total_quantity ? Number(row.total_quantity) : 0,
    };
  }

  async deleteWorkType(id: string) {
    await this.prisma.project_work_types.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { success: true };
  }

  // --- Project Departments ---

  async listProjectDepartments(projectId: string) {
    const rows = await this.prisma.project_departments.findMany({
      where: { project_id: projectId },
      include: {
        departments: { select: { id: true, name: true, icon: true, is_active: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    return rows.map((r) => ({
      projectId: r.project_id,
      departmentId: Number(r.department_id),
      departmentName: r.departments?.name ?? '',
      departmentIcon: r.departments?.icon ?? 'Folder',
      departmentIsActive: r.departments?.is_active ?? true,
      createdAt: r.created_at ? r.created_at.toISOString() : null,
    }));
  }

  async addProjectDepartment(projectId: string, departmentId: number) {
    const exists = await this.prisma.project_departments.findUnique({
      where: {
        project_id_department_id: {
          project_id: projectId,
          department_id: BigInt(departmentId),
        },
      },
    });

    if (exists) {
      throw new Error('Department is already added to this project');
    }

    const row = await this.prisma.project_departments.create({
      data: {
        project_id: projectId,
        department_id: BigInt(departmentId),
      },
      include: {
        departments: { select: { id: true, name: true, icon: true, is_active: true } },
      },
    });

    return {
      projectId: row.project_id,
      departmentId: Number(row.department_id),
      departmentName: row.departments?.name ?? '',
      departmentIcon: row.departments?.icon ?? 'Folder',
      departmentIsActive: row.departments?.is_active ?? true,
      createdAt: row.created_at ? row.created_at.toISOString() : null,
    };
  }

  async removeProjectDepartment(projectId: string, departmentId: number) {
    // Delete the project department. Foremen assignments for this department and works could be cascading?
    // Wait, project_department_foremen doesn't cascade by default unless we set it.
    // Let's delete foremen assignments explicitly just in case.
    await this.prisma.$transaction(async (tx) => {
      await tx.project_department_foremen.deleteMany({
        where: {
          project_id: projectId,
          department_id: BigInt(departmentId),
        },
      });

      await tx.project_departments.delete({
        where: {
          project_id_department_id: {
            project_id: projectId,
            department_id: BigInt(departmentId),
          },
        },
      });
    });

    return { success: true };
  }

  // --- Foremen Assignments ---

  async listForemenAssignments(projectId: string) {
    const rows = await this.prisma.project_department_foremen.findMany({
      where: { project_id: projectId },
      include: {
        departments: { select: { id: true, name: true } },
        users: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { assigned_at: 'asc' },
    });

    return rows.map((f) => ({
      id: f.id,
      projectId: f.project_id,
      departmentId: Number(f.department_id),
      departmentName: f.departments?.name ?? '',
      foremanId: f.foreman_id,
      foremanName: f.users
        ? `${f.users.firstName} ${f.users.lastName}`.trim()
        : '',
    }));
  }

  async bulkAssignForemen(
    projectId: string,
    assignments: { departmentId: number; foremanIds: number[] }[],
  ) {
    // We execute this in a transaction: 
    // Delete all existing assignments for this project
    // Insert all new assignments

    await this.prisma.$transaction(async (tx) => {
      await tx.project_department_foremen.deleteMany({
        where: { project_id: projectId },
      });

      const dataToInsert: any[] = [];
      for (const group of assignments) {
        for (const fId of group.foremanIds) {
          dataToInsert.push({
            project_id: projectId,
            department_id: BigInt(group.departmentId),
            foreman_id: fId,
          });
        }
      }

      if (dataToInsert.length > 0) {
        await tx.project_department_foremen.createMany({
          data: dataToInsert,
        });
      }
    });

    return { success: true };
  }

  async batchSyncDepartments(
    projectId: string,
    assignments: { departmentId: number; foremanIds: number[]; works?: { id?: string; name: string }[] }[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      const activeDepartmentIds = assignments.map((a) => BigInt(a.departmentId));

      // 1. Sync Project Departments
      if (activeDepartmentIds.length > 0) {
        await tx.project_departments.deleteMany({
          where: {
            project_id: projectId,
            department_id: { notIn: activeDepartmentIds },
          },
        });
      } else {
        await tx.project_departments.deleteMany({
          where: { project_id: projectId },
        });
      }

      for (const a of assignments) {
        await tx.project_departments.upsert({
          where: {
            project_id_department_id: {
              project_id: projectId,
              department_id: BigInt(a.departmentId),
            },
          },
          update: {},
          create: {
            project_id: projectId,
            department_id: BigInt(a.departmentId),
          },
        });
      }

      // 2. Sync Foremen
      await tx.project_department_foremen.deleteMany({
        where: { project_id: projectId },
      });
      const foremenToInsert: any[] = [];
      for (const a of assignments) {
        for (const fId of a.foremanIds) {
          foremenToInsert.push({
            project_id: projectId,
            department_id: BigInt(a.departmentId),
            foreman_id: fId,
          });
        }
      }
      if (foremenToInsert.length > 0) {
        await tx.project_department_foremen.createMany({ data: foremenToInsert });
      }


    });

    return { success: true };
  }

  // --- Resource Plans ---

  async listResourcePlans(workTypeId: string) {
    const rows = await this.prisma.resource_plans.findMany({
      where: { work_type_id: workTypeId },
      orderBy: { date_from: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      workTypeId: r.work_type_id,
      plannedWorkers: r.planned_workers ?? 0,
      dateFrom: r.date_from ? r.date_from.toISOString().split('T')[0] : null,
      dateTo: r.date_to ? r.date_to.toISOString().split('T')[0] : null,
    }));
  }

  async createResourcePlan(workTypeId: string, dto: CreateResourcePlanDto) {
    const row = await this.prisma.resource_plans.create({
      data: {
        work_type_id: workTypeId,
        planned_workers: dto.plannedWorkers,
        date_from: dto.dateFrom ? new Date(dto.dateFrom) : null,
        date_to: dto.dateTo ? new Date(dto.dateTo) : null,
      },
    });

    return {
      id: row.id,
      workTypeId: row.work_type_id,
      plannedWorkers: row.planned_workers ?? 0,
      dateFrom: row.date_from
        ? row.date_from.toISOString().split('T')[0]
        : null,
      dateTo: row.date_to ? row.date_to.toISOString().split('T')[0] : null,
    };
  }

  async deleteResourcePlan(id: string) {
    await this.prisma.resource_plans.delete({
      where: { id },
    });
    return { success: true };
  }

  // --- Hours Plan ---
  /**
   * Salary budget for the hours plan. The base is the contract value plus additional works (RD),
   * minus the warranty retention; salary categories take their planned share of it.
   */
  private async salaryBudget(projectId: string) {
    const [project, rd, salaryExpenses] = await Promise.all([
      this.prisma.projects.findUnique({
        where: { id: projectId },
        select: { contract_net_value: true, warranty_percent: true },
      }),
      this.prisma.milestones.aggregate({
        where: { project_id: projectId, deleted_at: null, type: 'roboty_dodatkowe' },
        _sum: { net_amount: true },
      }),
      this.prisma.planned_expenses.findMany({
        where: { project_id: projectId, cost_categories: { is_salary: true } },
        select: { planned_percent: true },
      }),
    ]);

    const contractNetValue = Number(project?.contract_net_value ?? 0);
    const additionalWorksValue = Number(rd._sum.net_amount ?? 0);
    const warrantyPercent = Number(project?.warranty_percent ?? 0);
    const totalValue = contractNetValue + additionalWorksValue;
    const projectBudget = totalValue - totalValue * (warrantyPercent / 100);

    const salaryPercent = salaryExpenses.reduce((sum, e) => sum + Number(e.planned_percent ?? 0), 0);
    const totalSalaryBudget = projectBudget > 0 ? (salaryPercent / 100) * projectBudget : 0;

    return { contractNetValue, additionalWorksValue, projectBudget, totalSalaryBudget };
  }

  async getHoursPlan(projectId: string) {
    const plan = await this.prisma.project_hours_plan.findUnique({
      where: { project_id: projectId },
    });

    const distributions = await this.prisma.work_type_hours_distribution.findMany({
      where: { project_id: projectId },
    });

    const { totalSalaryBudget, contractNetValue, additionalWorksValue } = await this.salaryBudget(projectId);

    return {
      averageHourlyRate: plan?.average_hourly_rate ? Number(plan.average_hourly_rate) : null,
      plannedHoursTotal: plan?.planned_hours_total ? Number(plan.planned_hours_total) : null,
      totalSalaryBudget,
      contractNetValue,
      additionalWorksValue,
      distributions: distributions.map((d) => ({
        id: d.id,
        workTypeId: d.work_type_id,
        percentage: d.percentage ? Number(d.percentage) : 0,
      })),
    };
  }

  async updateHoursPlan(
    projectId: string,
    dto: {
      averageHourlyRate: number;
      distributions: { workTypeId: string; percentage: number }[];
    },
  ) {
    const { totalSalaryBudget } = await this.salaryBudget(projectId);

    const plannedHoursTotal =
      dto.averageHourlyRate > 0
        ? totalSalaryBudget / dto.averageHourlyRate
        : 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.project_hours_plan.upsert({
        where: { project_id: projectId },
        update: {
          average_hourly_rate: dto.averageHourlyRate,
          planned_hours_total: plannedHoursTotal,
        },
        create: {
          project_id: projectId,
          average_hourly_rate: dto.averageHourlyRate,
          planned_hours_total: plannedHoursTotal,
        },
      });

      await tx.work_type_hours_distribution.deleteMany({
        where: { project_id: projectId },
      });

      if (dto.distributions && dto.distributions.length > 0) {
        await tx.work_type_hours_distribution.createMany({
          data: dto.distributions.map((d) => ({
            project_id: projectId,
            work_type_id: d.workTypeId,
            percentage: d.percentage,
          })),
        });
      }
    });

    return this.getHoursPlan(projectId);
  }

  // --- Fakturownia ---
  async searchFakturowniaInvoices(query: string, country?: string) {
    const apiToken = this.config.get<string>('FAKTUROWNIA_API_TOKEN');
    if (!apiToken) {
      throw new BadRequestException('Fakturownia API token is not configured on the server');
    }

    let subdomain = this.config.get<string>('FAKTUROWNIA_PL_SUBDOMAIN') || 'ispik';
    if (country) {
      const c = country.toLowerCase();
      if (c === 'łotwa' || c === 'latvia' || c === 'lv') {
        subdomain = this.config.get<string>('FAKTUROWNIA_LV_SUBDOMAIN') || subdomain;
      } else if (c === 'rumunia' || c === 'romania' || c === 'ro') {
        subdomain = this.config.get<string>('FAKTUROWNIA_RO_SUBDOMAIN') || subdomain;
      } else if (c === 'hiszpania' || c === 'spain' || c === 'es') {
        subdomain = this.config.get<string>('FAKTUROWNIA_ES_SUBDOMAIN') || subdomain;
      }
    }

    const url = `https://${subdomain}.fakturownia.pl/invoices.json?api_token=${apiToken}&period=all&per_page=100`;

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      if (!response.ok) {
        throw new BadRequestException(`Fakturownia API returned status: ${response.status}`);
      }
      
      let invoices = await response.json();
      if (!Array.isArray(invoices)) {
        return [];
      }
      
      // Filter out negative values (corrections, refunds) to only show positive income
      invoices = invoices.filter((inv: any) => 
        inv.price_gross > 0 && inv.kind !== 'correction'
      );
      
      if (query) {
        const q = query.toLowerCase();
        return invoices.filter((inv: any) => 
          String(inv.price_gross).includes(q) || 
          String(inv.price_net).includes(q) || 
          (inv.number && inv.number.toLowerCase().includes(q))
        );
      }
      
      return invoices;
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException('Failed to fetch invoices from Fakturownia: ' + e.message);
    }
  }
}
