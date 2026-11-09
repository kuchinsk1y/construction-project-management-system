import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CrewService, type CrewWorker } from './crew.service';
import { ST_BR_SHEETS, StBrSheetsClient, gvizText, type SheetRow } from './sheets/st-br-sheets.client';

const CACHE_TTL_MS = 60_000;
const HISTORY_DAYS = 14;
const DONE_PROJECT_STATUSES = ['COMPLETED', 'DONE', 'ARCHIVED'];

type Worker = Pick<CrewWorker, 'id' | 'company' | 'position'>;
type CountItem = { name: string; count: number };

export type PulpitStats = {
  generatedAt: string;
  today: string;
  /** Crew from the ST_BR Google Sheets (ISPIK, ISPIK Łotwa, agencies), matched by the foreman's last name */
  workers: {
    total: number;
    ispikPolska: { count: number; positions: CountItem[] };
    ispikLotwa: { count: number; positions: CountItem[] };
    agencies: { count: number; companies: CountItem[]; positions: CountItem[] };
  } | null;
  /** Last 14 days from the work journal sheet, matched by "First Last" */
  activity: {
    latestEntryDate: string | null;
    daysWithoutEntry: number | null;
    /** Every day of the window; `filled` = the foreman wrote that day, `workers` = people with hours > 0 */
    days: Array<{ date: string; filled: boolean; workers: number; hours: number }>;
  } | null;
  /** Projects of the foreman in ERP (assigned in project departments) */
  projects: Array<{ id: string; name: string; city: string; status: string; departments: string[] }>;
  /** Parts that could not be loaded (the rest is still shown) */
  warnings: string[];
};

/**
 * Foreman's dashboard. Projects come from ERP; crew and history still come from the
 * Google Sheets of ST_BR (until workers move into ERP). Cached for a minute per foreman.
 */
@Injectable()
export class PulpitService {
  private readonly logger = new Logger(PulpitService.name);
  private readonly cache = new Map<number, { at: number; data: PulpitStats }>();
  private readonly inFlight = new Map<number, Promise<PulpitStats>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheets: StBrSheetsClient,
    private readonly crew: CrewService,
    private readonly config: ConfigService,
  ) {}

  get(userId: number, fresh = false): Promise<PulpitStats> {
    const cached = this.cache.get(userId);
    if (!fresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return Promise.resolve(cached.data);

    const pending = this.inFlight.get(userId);
    if (pending) return pending;

    const request = this.load(userId)
      .then((data) => {
        for (const [key, entry] of this.cache) if (Date.now() - entry.at >= CACHE_TTL_MS) this.cache.delete(key);
        // Do not keep a result with errors: the next open tries again
        if (data.warnings.length === 0) this.cache.set(userId, { at: Date.now(), data });
        return data;
      })
      .finally(() => this.inFlight.delete(userId));
    this.inFlight.set(userId, request);
    return request;
  }

  private async load(userId: number): Promise<PulpitStats> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, isActive: true },
    });
    if (!user?.isActive) throw new UnauthorizedException();

    const today = this.today();
    const lastName = user.lastName.trim();
    const fullName = `${user.firstName.trim()} ${lastName}`;

    const [crew, history, projects] = await Promise.allSettled([
      this.crew.get(lastName),
      this.history(fullName, shiftDate(today, -HISTORY_DAYS)),
      this.projects(userId),
    ]);

    const warnings: string[] = [];
    const failed = (r: PromiseSettledResult<unknown>, what: string) => {
      if (r.status === 'fulfilled') return false;
      this.logger.warn(`Pulpit of user ${userId}: ${what} failed: ${(r.reason as Error)?.message}`);
      return true;
    };

    let workers: PulpitStats['workers'] = null;
    if (failed(crew, 'crew')) warnings.push('Nie udało się pobrać listy pracowników z Google Sheets.');
    else workers = buildCrew((crew as PromiseFulfilledResult<CrewWorker[]>).value);

    let activity: PulpitStats['activity'] = null;
    if (failed(history, 'history')) warnings.push('Nie udało się pobrać historii wpisów z Google Sheets.');
    else activity = buildActivity((history as PromiseFulfilledResult<SheetRow[]>).value, today);

    let projectList: PulpitStats['projects'] = [];
    if (failed(projects, 'projects')) warnings.push('Nie udało się pobrać obiektów z ERP.');
    else projectList = (projects as PromiseFulfilledResult<PulpitStats['projects']>).value;

    return { generatedAt: new Date().toISOString(), today, workers, activity, projects: projectList, warnings };
  }

  // --- ERP ---

  private async projects(userId: number): Promise<PulpitStats['projects']> {
    const rows = await this.prisma.project_department_foremen.findMany({
      where: { foreman_id: userId, projects: { deleted_at: null, status: { notIn: DONE_PROJECT_STATUSES } } },
      select: {
        departments: { select: { name: true } },
        projects: { select: { id: true, name: true, city: true, status: true } },
      },
    });
    const byId = new Map<string, PulpitStats['projects'][number]>();
    for (const row of rows) {
      const p = row.projects;
      const item = byId.get(p.id) ?? { id: p.id, name: p.name, city: p.city, status: p.status, departments: [] };
      if (!item.departments.includes(row.departments.name)) item.departments.push(row.departments.name);
      byId.set(p.id, item);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }

  // --- Google Sheets ---

  private async history(fullName: string, from: string): Promise<SheetRow[]> {
    return this.sheets.query(ST_BR_SHEETS.workJournal, (c) => {
      const [date, foreman, workerId, workerName, hours] = [
        c['data_robot'],
        c['kierownik'],
        c['id_pracownika'],
        c['pracownik'],
        c['ilosc_godzin'],
      ];
      if (!date || !foreman || !hours) return null;
      const picked: Array<[string, string]> = [
        [date, 'date'],
        [hours, 'hours'],
      ];
      if (workerId) picked.push([workerId, 'workerId']);
      if (workerName) picked.push([workerName, 'workerName']);
      return (
        `select ${picked.map(([col]) => col).join(', ')} ` +
        `where lower(${foreman}) = ${gvizText(fullName.toLowerCase())} and ${date} >= date '${from}' ` +
        `label ${picked.map(([col, name]) => `${col} '${name}'`).join(', ')}`
      );
    });
  }

  private today() {
    const timeZone = this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}

// --- calculations (ported from ST_BR pulpit-stats) ---

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

const plain = (company: string) =>
  company
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
const isIspikLv = (company: string) => {
  const c = plain(company);
  return c.includes('ispik') && (c.includes('latvia') || c.includes('lotwa') || /\blv\b/.test(c));
};
const isIspik = (company: string) => plain(company).includes('ispik');

function countBy(workers: Worker[], key: (w: Worker) => string): CountItem[] {
  const counts = new Map<string, number>();
  for (const w of workers) counts.set(key(w), (counts.get(key(w)) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'));
}
const positions = (workers: Worker[]) => countBy(workers, (w) => w.position || 'Brak stanowiska');

/** The crew comes already without repeats (CrewService) */
function buildCrew(all: Worker[]): NonNullable<PulpitStats['workers']> {
  const pl = all.filter((w) => isIspik(w.company) && !isIspikLv(w.company));
  const lv = all.filter((w) => isIspikLv(w.company));
  const agencies = all.filter((w) => !isIspik(w.company));
  return {
    total: all.length,
    ispikPolska: { count: pl.length, positions: positions(pl) },
    ispikLotwa: { count: lv.length, positions: positions(lv) },
    agencies: { count: agencies.length, companies: countBy(agencies, (w) => w.company || 'Nieznana'), positions: positions(agencies) },
  };
}

function buildActivity(rows: SheetRow[], today: string): NonNullable<PulpitStats['activity']> {
  const byDate = new Map<string, { workers: Set<string>; hours: number }>();
  for (const row of rows) {
    const date = text(row.date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const day = byDate.get(date) ?? { workers: new Set<string>(), hours: 0 };
    const hours = Number(String(row.hours ?? '').replace(',', '.'));
    // Days off, vacations, sick leave are written with 0 hours: the day counts as filled in, the person as not working
    if (Number.isFinite(hours) && hours > 0) {
      day.hours += hours;
      const who = text(row.workerId) || text(row.workerName);
      if (who) day.workers.add(who);
    }
    byDate.set(date, day);
  }

  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => shiftDate(today, i - HISTORY_DAYS + 1)).map((date) => {
    const day = byDate.get(date);
    return { date, filled: !!day, workers: day?.workers.size ?? 0, hours: Math.round((day?.hours ?? 0) * 100) / 100 };
  });

  const latestEntryDate = [...byDate.keys()].filter((d) => d <= today).sort().pop() ?? null;
  const daysWithoutEntry = latestEntryDate ? Math.max(0, daysBetween(latestEntryDate, today)) : null;
  return { latestEntryDate, daysWithoutEntry, days };
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
