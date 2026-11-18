import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BrigadeForeman } from '../auth/access';
import { PrismaService } from '../prisma/prisma.service';
import { CrewService, type CrewWorker } from './crew.service';
import { PV_SERVICE_WORK_TYPES } from './pv-service-work-types';
import { TmaBrigadeClient } from './tma/tma-brigade.client';
import type { TmaAbsenceType, TmaCheckIn } from './tma/tma-brigade.types';
import type { RowKind } from './work-log.service';

export const SERVICE_PROJECT_ID = 'serwis';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** How far back the nearest open day is looked for when the form opens */
const SUGGEST_LOOKBACK_DAYS = 62;

/** Month of the date picker: which days TMA opens for filling in */
export type FormCalendar = {
  month: string;
  today: string;
  /** Open days of the month (YYYY-MM-DD); every other day is closed */
  openDays: string[];
  /** Day the form should open on: today when open, else the latest open day before it; null = none */
  suggestedDate: string | null;
};

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
  /** TMA allows filling in this day; when false the form is read-only */
  dayOpen: boolean;
  /** The day is already written (entries are not stored yet, so always false for now) */
  alreadyFilled: boolean;
  generatedAt: string;
  /** Crew from TMA; status = absence on the date (TMA); lastRating = previous Friday rating (none stored yet) */
  /**
   * Crew from TMA. projectId = project of his QR check-in that day, else the project he is assigned to;
   * checkIns = his check-ins that day (empty = none; several = several projects); status = absence on the date; lastRating = previous Friday rating
   */
  crew: Array<
    CrewWorker & {
      status: TmaAbsenceType | null;
      lastRating: number | null;
      /**
       * All his check-ins that day, earliest first: a worker can check in on several projects (one per project visit).
       * at = check-in, closedAt = end of that visit (null while open); the form suggests hours from them.
       */
      checkIns: Array<{
        /** TMA work day event id: goes with the hours to work_hours.work_day_event_id */
        id: string;
        projectId: string;
        at: string;
        closedAt: string | null;
        method: TmaCheckIn['checkInMethod'];
        status: TmaCheckIn['status'];
        /** Work type chosen in TMA (only when it belongs to the check-in project) and the worker's note */
        workTypeId: string | null;
        note: string | null;
      }>;
    }
  >;
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
 * Crew, absences and the list of projects come from TMA; project details, work types and surcharges from ERP.
 * Nothing is written yet.
 */
@Injectable()
export class DayFormService {
  private readonly logger = new Logger(DayFormService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crew: CrewService,
    private readonly tma: TmaBrigadeClient,
    private readonly config: ConfigService,
  ) {}

  /** Open days of `month` (RRRR-MM, default current) and the day the form should start on */
  async calendar(foreman: BrigadeForeman, month: string | undefined): Promise<FormCalendar> {
    const today = this.today();
    const m = month?.trim() || today.slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new BadRequestException('month: format RRRR-MM');

    const from = `${m}-01`;
    const to = lastDayOfMonth(m);
    const [openDays, recent] = await Promise.all([
      this.tma.openDays(foreman.id, from, to),
      this.tma.openDays(foreman.id, shiftDate(today, -SUGGEST_LOOKBACK_DAYS), today),
    ]);
    return { month: m, today, openDays, suggestedDate: recent.includes(today) ? today : (recent.at(-1) ?? null) };
  }

  async get(foreman: BrigadeForeman, date: string): Promise<DayForm> {
    if (!isRealDate(date)) throw new BadRequestException('date: format RRRR-MM-DD');

    // Crew and projects are required (403 when TMA no longer knows this foreman)
    const data = await this.crew.get(foreman);
    const [open, absences, checkIns, projects, surcharges] = await Promise.allSettled([
      this.tma.openDays(foreman.id, date, date),
      this.crew.absencesOn(foreman, date),
      this.tma.checkIns(foreman.id, date),
      this.projects(data.projectIds),
      this.surcharges(date),
    ]);

    const warnings: string[] = [];
    const value = <T>(r: PromiseSettledResult<T>, fallback: T, warning: string): T => {
      if (r.status === 'fulfilled') return r.value;
      this.logger.warn(`Day form of foreman ${foreman.id}: ${warning} (${(r.reason as Error)?.message})`);
      warnings.push(warning);
      return fallback;
    };
    // Several check-ins of one worker = he worked on several projects that day
    const checkedIn = new Map<string, TmaCheckIn[]>();
    for (const c of value(checkIns, [] as TmaCheckIn[], 'Nie udało się pobrać odbić QR z TMA — obiekty wybierz ręcznie.')) {
      checkedIn.set(c.workerId, [...(checkedIn.get(c.workerId) ?? []), c]);
    }
    for (const list of checkedIn.values()) list.sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));
    const absent = value(absences, new Map<string, TmaAbsenceType>(), 'Nie udało się sprawdzić urlopów i zwolnień w TMA — sprawdź je ręcznie.');

    return {
      date,
      isFriday: new Date(`${date}T00:00:00Z`).getUTCDay() === 5,
      // Unknown (TMA did not answer) counts as closed: nothing can be written to a day TMA has not opened
      dayOpen: value(open, [] as string[], 'Nie udało się sprawdzić w TMA, czy ten dzień jest otwarty.').includes(date),
      alreadyFilled: false,
      generatedAt: new Date().toISOString(),
      crew: data.crew.map((w) => {
        const list = checkedIn.get(w.id) ?? [];
        // The project of his first check-in that day wins over the one he is assigned to (if it is one of the foreman's)
        const checkInProject = list.find((c) => data.projectIds.includes(c.projectId))?.projectId ?? null;
        return {
          ...w,
          projectId: checkInProject ?? w.projectId,
          status: absent.get(w.id) ?? null,
          lastRating: null,
          checkIns: list.map((c) => ({
            id: c.id,
            projectId: c.projectId,
            at: c.checkInAt,
            closedAt: c.closedAt,
            method: c.checkInMethod,
            status: c.status,
            workTypeId: c.workTypeId,
            note: c.workDescription,
          })),
        };
      }),
      projects: value(projects, [], 'Nie udało się pobrać obiektów z ERP.'),
      serviceKinds: SERVICE_KINDS,
      foremanKinds: FOREMAN_KINDS,
      surcharges: value(surcharges, [], 'Nie udało się pobrać dopłat z ERP.'),
      warnings,
    };
  }

  private today() {
    const timeZone = this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }

  // --- ERP ---

  /** Foreman's projects (ids from TMA) with all their work types as added in ERP, and "Serwis" at the end */
  private async projects(projectIds: string[]): Promise<DayForm['projects']> {
    const ids = [...new Set(projectIds.filter((id) => UUID.test(id)))];

    const workTypeSelect = { id: true, name: true, unit: true, departments: { select: { name: true } } } as const;
    const [projects, storageWorkTypes] = await Promise.all([
      this.prisma.projects.findMany({
        where: { id: { in: ids }, deleted_at: null },
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
}

function sortByName<T extends { name: string }>(list: T[]) {
  return list.sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true }));
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
