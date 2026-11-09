import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurchargeDto, UpdateSurchargeDto } from './surcharge.dto';

type SurchargeRow = {
  id: string;
  name: string;
  rate_per_hour: unknown;
  valid_from: Date;
  valid_to: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toDate = (d: Date | null) => (d ? d.toISOString().split('T')[0] : null);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;
/** YYYY-MM-DD that exists in the calendar (2026-02-30 does not) */
const isRealDate = (d: string) => {
  if (!DATE.test(d)) return false;
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(d);
};

/** Today in Poland (the business works in Europe/Warsaw), as YYYY-MM-DD */
export function todayInWarsaw(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
}

@Injectable()
export class SurchargesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.surcharges.findMany({
      orderBy: [{ is_active: 'desc' }, { valid_from: 'desc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.map(r));
  }

  /**
   * Surcharges for a day or a period, for the brigade app: the active ones overlapping the period,
   * and per day which of them apply. ERP decides applicability; the client only shows it.
   */
  async forPeriod(query: { date?: string; dateFrom?: string; dateTo?: string }) {
    const single = query.date ?? (query.dateFrom || query.dateTo ? undefined : todayInWarsaw());
    const from = single ?? query.dateFrom;
    const to = single ?? query.dateTo;
    if (!from || !to) throw new BadRequestException('Podaj date albo dateFrom i dateTo');
    if (![from, to].every(isRealDate)) {
      throw new BadRequestException('Data musi mieć format RRRR-MM-DD');
    }
    if (to < from) throw new BadRequestException('dateTo nie może być wcześniejsza niż dateFrom');
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
    if (days > MAX_DAYS) throw new BadRequestException(`Okres może mieć maksymalnie ${MAX_DAYS} dni`);

    const rows = await this.prisma.surcharges.findMany({
      where: {
        is_active: true,
        valid_from: { lte: new Date(to) },
        OR: [{ valid_to: null }, { valid_to: { gte: new Date(from) } }],
      },
      orderBy: [{ name: 'asc' }, { valid_from: 'asc' }],
    });
    const surcharges = rows.map((r) => this.mapPublic(r));

    const perDay = Array.from({ length: days }, (_, i) => {
      const day = new Date(Date.parse(from) + i * 86_400_000).toISOString().split('T')[0];
      return {
        date: day,
        surchargeIds: surcharges.filter((s) => s.validFrom <= day && (!s.validTo || s.validTo >= day)).map((s) => s.id),
      };
    });

    return { dateFrom: from, dateTo: to, generatedAt: new Date().toISOString(), surcharges, days: perDay };
  }

  async create(dto: CreateSurchargeDto) {
    this.assertRange(dto.validFrom, dto.validTo ?? null);
    const row = await this.prisma.surcharges.create({
      data: {
        name: dto.name.trim(),
        rate_per_hour: dto.ratePerHour,
        valid_from: new Date(dto.validFrom),
        valid_to: dto.validTo ? new Date(dto.validTo) : null,
        is_active: dto.isActive ?? true,
      },
    });
    return this.map(row);
  }

  async update(id: string, dto: UpdateSurchargeDto) {
    const existing = await this.prisma.surcharges.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dopłata nie istnieje');

    const validFrom = dto.validFrom ?? toDate(existing.valid_from)!;
    const validTo = dto.validTo === undefined ? toDate(existing.valid_to) : dto.validTo;
    this.assertRange(validFrom, validTo);

    const row = await this.prisma.surcharges.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        rate_per_hour: dto.ratePerHour,
        valid_from: dto.validFrom ? new Date(dto.validFrom) : undefined,
        valid_to: dto.validTo === undefined ? undefined : dto.validTo ? new Date(dto.validTo) : null,
        is_active: dto.isActive,
      },
    });
    return this.map(row);
  }

  async remove(id: string) {
    await this.prisma.surcharges.delete({ where: { id } });
    return { success: true };
  }

  private assertRange(from: string, to: string | null) {
    if (to && to < from) throw new BadRequestException('Data „do” nie może być wcześniejsza niż data „od”');
  }

  /** What other services get: no audit fields except the last change */
  private mapPublic(r: SurchargeRow) {
    return {
      id: r.id,
      name: r.name,
      ratePerHour: Number(r.rate_per_hour),
      currency: 'PLN',
      validFrom: toDate(r.valid_from)!,
      validTo: toDate(r.valid_to),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  private map(r: SurchargeRow) {
    return {
      id: r.id,
      name: r.name,
      ratePerHour: Number(r.rate_per_hour),
      validFrom: toDate(r.valid_from),
      validTo: toDate(r.valid_to),
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
