import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrewService, type CrewWorker } from './crew.service';
import { PV_SERVICE_WORK_TYPES } from './pv-service-work-types';
import { ST_BR_SHEETS, StBrSheetsClient, gvizText } from './sheets/st-br-sheets.client';
import type { RowKind } from './work-log.service';

const DONE_PROJECT_STATUSES = ['COMPLETED', 'DONE', 'ARCHIVED'];
/** How far back the last Friday rating is looked for */
const RATINGS_LOOKBACK_DAYS = 45;
export const SERVICE_PROJECT_ID = 'serwis';

/** Kinds that are not work: the row has 0 hours and no surcharge */
const SERVICE_KINDS: Array<{ name: string; kind: RowKind }> = [
  { name: 'Urlop', kind: 'vacation' },
  { name: 'Chory', kind: 'sick' },
  { name: 'Wolne', kind: 'day_off' },
  { name: 'Absencja', kind: 'absence' },
  { name: 'Pijaństwo', kind: 'penalty' },
  { name: 'Pijaństwo budowa', kind: 'penalty' },
  { name: 'Zwolniony', kind: 'dismissed' },
];
const FOREMAN_KINDS: Array<{ name: string; kind: RowKind }> = [
  { name: 'Praca', kind: 'work' },
  { name: 'Wolne', kind: 'day_off' },
  { name: 'Urlop', kind: 'vacation' },
  { name: 'Chory', kind: 'sick' },
];

type WorkTypeOption = { id: string; name: string; unit: string | null; department: string | null };

export type DayForm = {
  date: string;
  isFriday: boolean;
  /** The journal already has entries of this foreman for the date: the day cannot be written again */
  alreadyFilled: boolean;
  generatedAt: string;
  crew: Array<CrewWorker & { status: 'vacation' | 'dismissed' | null; lastRating: number | null }>;
  /** Foreman's ERP projects with their work types, then "Serwis" */
  projects: Array<{ id: string; name: string; city: string | null; isService: boolean; workTypes: WorkTypeOption[] }>;
  serviceKinds: Array<{ name: string; kind: RowKind }>;
  foremanKinds: Array<{ name: string; kind: RowKind }>;
  /** Surcharges valid on the date («Warunki»), from ERP */
  surcharges: Array<{ id: string; name: string; ratePerHour: number }>;
  warnings: string[];
};

/**
 * Everything the "Dodaj wpis" form needs for one date, in one answer.
 * Projects, work types and surcharges come from ERP; crew, vacations, dismissals and history from the ST_BR sheets.
 * Nothing is written yet.
 */
@Injectable()
export class DayFormService {
  private readonly logger = new Logger(DayFormService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheets: StBrSheetsClient,
    private readonly crew: CrewService,
  ) {}

  async get(userId: number, date: string): Promise<DayForm> {
    if (!isRealDate(date)) throw new BadRequestException('date: format RRRR-MM-DD');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, isActive: true },
    });
    if (!user?.isActive) throw new UnauthorizedException();
    const lastName = user.lastName.trim();
    const fullName = `${user.firstName.trim()} ${lastName}`;

    const [crew, vacations, dismissals, journal, projects, surcharges] = await Promise.allSettled([
      this.crew.get(lastName),
      this.vacations(date),
      this.dismissals(date),
      this.journal(fullName, date),
      this.projects(userId),
      this.surcharges(date),
    ]);

    const warnings: string[] = [];
    const value = <T>(r: PromiseSettledResult<T>, fallback: T, warning: string): T => {
      if (r.status === 'fulfilled') return r.value;
      this.logger.warn(`Day form of user ${userId}: ${warning} (${(r.reason as Error)?.message})`);
      warnings.push(warning);
      return fallback;
    };

    const crewList = value(crew, [], 'Nie udało się pobrać listy pracowników.');
    const onVacation = value(vacations, new Set<string>(), 'Nie udało się sprawdzić urlopów — sprawdź je ręcznie.');
    const dismissed = value(dismissals, new Set<string>(), 'Nie udało się sprawdzić zwolnień — sprawdź je ręcznie.');
    const history = value(journal, { filled: false, ratings: new Map<string, number>() }, 'Nie udało się sprawdzić historii wpisów.');

    return {
      date,
      isFriday: new Date(`${date}T00:00:00Z`).getUTCDay() === 5,
      alreadyFilled: history.filled,
      generatedAt: new Date().toISOString(),
      crew: crewList.map((w) => ({
        ...w,
        status: onVacation.has(w.id) ? 'vacation' : dismissed.has(w.id) ? 'dismissed' : null,
        lastRating: history.ratings.get(w.key) ?? null,
      })),
      projects: value(projects, [], 'Nie udało się pobrać obiektów z ERP.'),
      serviceKinds: SERVICE_KINDS,
      foremanKinds: FOREMAN_KINDS,
      surcharges: value(surcharges, [], 'Nie udało się pobrać dopłat z ERP.'),
      warnings,
    };
  }

  // --- ERP ---

  /** Foreman's projects with all their work types (as added in ERP), and "Serwis" at the end */
  private async projects(userId: number): Promise<DayForm['projects']> {
    const assigned = await this.prisma.project_department_foremen.findMany({
      where: { foreman_id: userId, projects: { deleted_at: null, status: { notIn: DONE_PROJECT_STATUSES } } },
      select: { project_id: true },
    });
    const ids = [...new Set(assigned.map((a) => a.project_id))];

    const workTypeSelect = { id: true, name: true, unit: true, departments: { select: { name: true } } } as const;
    const [projects, storageWorkTypes] = await Promise.all([
      this.prisma.projects.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          city: true,
          project_work_types: { where: { deleted_at: null }, select: workTypeSelect },
        },
      }),
      // "Serwis": work types of energy-storage projects + the fixed PV list (as in ST_BR)
      this.prisma.project_work_types.findMany({
        where: { deleted_at: null, projects: { deleted_at: null, project_types: { code: 'MAGAZYN_ENERGII' } } },
        select: workTypeSelect,
      }),
    ]);

    const option = (w: { id: string; name: string; unit: string | null; departments: { name: string } | null }): WorkTypeOption => ({
      id: w.id,
      name: w.name,
      unit: w.unit,
      department: w.departments?.name ?? null,
    });

    const list: DayForm['projects'] = projects
      .map((p) => ({ id: p.id, name: p.name, city: p.city, isService: false, workTypes: sortByName(p.project_work_types.map(option)) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    const serviceNames = new Set<string>();
    const service: WorkTypeOption[] = [];
    for (const w of storageWorkTypes.map(option)) {
      if (serviceNames.has(w.name.toLowerCase())) continue;
      serviceNames.add(w.name.toLowerCase());
      service.push(w);
    }
    for (const w of PV_SERVICE_WORK_TYPES) {
      if (serviceNames.has(w.name.toLowerCase())) continue;
      serviceNames.add(w.name.toLowerCase());
      service.push({ id: `pv:${w.name}`, name: w.name, unit: null, department: w.department });
    }
    list.push({ id: SERVICE_PROJECT_ID, name: 'Serwis', city: null, isService: true, workTypes: sortByName(service) });
    return list;
  }

  private async surcharges(date: string): Promise<DayForm['surcharges']> {
    const day = new Date(`${date}T00:00:00Z`);
    const rows = await this.prisma.surcharges.findMany({
      where: { is_active: true, valid_from: { lte: day }, OR: [{ valid_to: null }, { valid_to: { gte: day } }] },
      select: { id: true, name: true, rate_per_hour: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name, ratePerHour: Number(r.rate_per_hour) }));
  }

  // --- Google Sheets (same rules as ST_BR) ---

  /** Ids of workers with an accepted vacation covering the date */
  private async vacations(date: string): Promise<Set<string>> {
    const rows = await this.sheets.query(ST_BR_SHEETS.vacations, (c) => {
      const [id, from, to, status] = [c['ID pracownika'], c['Data początku urlopu'], c['Data końca urlopu'], c['Status']];
      if (!id || !from || !to || !status) return null;
      return `select ${id} where ${status} = 'Zaakceptowane' and ${from} <= date '${date}' and ${to} >= date '${date}' label ${id} 'id'`;
    });
    return new Set(rows.map((r) => text(r.id)).filter(Boolean));
  }

  /** Ids of workers whose accepted dismissal is on the date */
  private async dismissals(date: string): Promise<Set<string>> {
    const rows = await this.sheets.query(ST_BR_SHEETS.resignations, (c) => {
      const [id, day, status] = [c['ID pracownika'], c['Data zwolnienia'], c['Status']];
      if (!id || !day || !status) return null;
      return `select ${id} where ${status} = 'Zaakceptowane' and ${day} = date '${date}' label ${id} 'id'`;
    });
    return new Set(rows.map((r) => text(r.id)).filter(Boolean));
  }

  /** Whether the date is already written, and the last rating of each worker before it */
  private async journal(fullName: string, date: string) {
    const from = shiftDate(date, -RATINGS_LOOKBACK_DAYS);
    const rows = await this.sheets.query(ST_BR_SHEETS.workJournal, (c) => {
      const [day, foreman, workerId, company, rating] = [c['data_robot'], c['kierownik'], c['id_pracownika'], c['firma'], c['ocena']];
      if (!day || !foreman || !workerId || !company || !rating) return null;
      return (
        `select ${day}, ${workerId}, ${company}, ${rating} ` +
        `where lower(${foreman}) = ${gvizText(fullName.toLowerCase())} and ${day} >= date '${from}' and ${day} <= date '${date}' ` +
        `order by ${day} desc label ${day} 'date', ${workerId} 'id', ${company} 'company', ${rating} 'rating'`
      );
    });

    let filled = false;
    const ratings = new Map<string, number>();
    for (const r of rows) {
      const day = text(r.date).slice(0, 10);
      if (day === date) {
        filled = true;
        continue;
      }
      const rating = Number(r.rating);
      const key = `${text(r.company)}:${text(r.id)}`;
      if (Number.isInteger(rating) && rating >= 1 && rating <= 5 && !ratings.has(key)) ratings.set(key, rating);
    }
    return { filled, ratings };
  }
}

function sortByName<T extends { name: string }>(list: T[]) {
  return list.sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true }));
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
