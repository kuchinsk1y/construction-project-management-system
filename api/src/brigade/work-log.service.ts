import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ST_BR_SHEETS, StBrSheetsClient, gvizText, type SheetRow } from './sheets/st-br-sheets.client';

const CACHE_TTL_MS = 30_000;
export const WORK_LOG_MAX_DAYS = 14;

/** Meaning of a row: the app colours it by this */
export type RowKind = 'work' | 'extra' | 'day_off' | 'vacation' | 'sick' | 'dismissed' | 'absence' | 'penalty';

export type WorkLogRow = {
  project: { id: string | null; name: string } | null;
  workType: { id: string | null; name: string; kind: RowKind };
  hours: number;
  /** Surcharge per hour in PLN (e.g. "trudne warunki"); null = none */
  surcharge: { ratePerHour: number } | null;
  note: string | null;
};

export type WorkLog = {
  from: string;
  to: string;
  /** Where the history comes from now: the ST_BR journal sheet; later ERP */
  source: 'sheets' | 'erp';
  generatedAt: string;
  days: Array<{
    date: string;
    /** Approval of the day (ERP only); null while the journal is in Google Sheets */
    status: null;
    totals: { workers: number; hours: number };
    workers: Array<{
      worker: { id: string | null; name: string; company: string | null };
      hours: number;
      rating: number | null;
      rows: WorkLogRow[];
    }>;
  }>;
};

/**
 * History of the foreman's entries, grouped by day → worker → rows.
 * The foreman is always the signed-in user (no name in the request).
 * Names and companies are taken from the entry itself, so dismissed people still show.
 */
@Injectable()
export class WorkLogService {
  private readonly cache = new Map<string, { at: number; data: WorkLog }>();
  private readonly inFlight = new Map<string, Promise<WorkLog>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheets: StBrSheetsClient,
    private readonly config: ConfigService,
  ) {}

  get(userId: number, days: number, fresh = false): Promise<WorkLog> {
    const key = `${userId}|${days}`;
    const cached = this.cache.get(key);
    if (!fresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return Promise.resolve(cached.data);

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const request = this.load(userId, days)
      .then((data) => {
        for (const [k, entry] of this.cache) if (Date.now() - entry.at >= CACHE_TTL_MS) this.cache.delete(k);
        this.cache.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  /** New entries change the history at once (used after saving a day) */
  forget(userId: number) {
    for (const key of this.cache.keys()) if (key.startsWith(`${userId}|`)) this.cache.delete(key);
  }

  private async load(userId: number, days: number): Promise<WorkLog> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, isActive: true },
    });
    if (!user?.isActive) throw new UnauthorizedException();

    const to = this.today();
    const from = shiftDate(to, -(days - 1));
    const fullName = `${user.firstName.trim()} ${user.lastName.trim()}`;

    const [rows, projects] = await Promise.all([
      this.journal(fullName, from, to),
      this.prisma.projects.findMany({ where: { deleted_at: null }, select: { id: true, name: true } }),
    ]);
    // Journal has project names: link them to ERP projects when the name matches
    const projectIds = new Map(projects.map((p) => [norm(p.name), p.id]));

    return { from, to, source: 'sheets', generatedAt: new Date().toISOString(), days: group(rows, projectIds) };
  }

  private journal(fullName: string, from: string, to: string) {
    return this.sheets.query(ST_BR_SHEETS.workJournal, (c) => {
      const need = { date: c['data_robot'], foreman: c['kierownik'], hours: c['ilosc_godzin'], workerName: c['pracownik'] };
      if (!need.date || !need.foreman || !need.hours || !need.workerName) return null;
      const optional: Record<string, string | undefined> = {
        workerId: c['id_pracownika'],
        company: c['firma'],
        project: c['obiekt'],
        workType: c['rodzaj_roboty'],
        premia: c['premia'],
        doplata: c['doplata'],
        rating: c['ocena'],
        note: c['komentarz'],
      };
      const picked = Object.entries({ date: need.date, hours: need.hours, workerName: need.workerName, ...optional }).filter(
        (e): e is [string, string] => !!e[1],
      );
      return (
        `select ${picked.map(([, col]) => col).join(', ')} ` +
        `where lower(${need.foreman}) = ${gvizText(fullName.toLowerCase())} ` +
        `and ${need.date} >= date '${from}' and ${need.date} <= date '${to}' ` +
        `order by ${need.date} desc ` +
        `label ${picked.map(([name, col]) => `${col} '${name}'`).join(', ')}`
      );
    });
  }

  private today() {
    const timeZone = this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}

// --- grouping ---

function group(rows: SheetRow[], projectIds: Map<string, string>): WorkLog['days'] {
  const days = new Map<string, Map<string, WorkLog['days'][number]['workers'][number]>>();

  for (const r of rows) {
    const date = text(r.date)?.slice(0, 10);
    const name = text(r.workerName);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !name) continue;

    const workerId = text(r.workerId);
    const key = workerId ?? `name:${name.toLowerCase()}`;
    const workers = days.get(date) ?? new Map();
    const entry = workers.get(key) ?? {
      worker: { id: workerId, name, company: text(r.company) },
      hours: 0,
      rating: null,
      rows: [],
    };

    const hours = num(r.hours) ?? 0;
    const surcharge = num(r.premia) || num(r.doplata);
    const projectName = text(r.project);
    const workTypeName = text(r.workType) ?? '—';
    entry.rows.push({
      project: projectName ? { id: projectIds.get(norm(projectName)) ?? null, name: projectName } : null,
      workType: { id: null, name: workTypeName, kind: kindOf(workTypeName) },
      hours,
      surcharge: surcharge && surcharge > 0 ? { ratePerHour: surcharge } : null,
      note: text(r.note),
    });
    entry.hours = round(entry.hours + hours);
    const rating = num(r.rating);
    if (entry.rating === null && rating !== null && rating >= 1 && rating <= 5) entry.rating = rating;

    workers.set(key, entry);
    days.set(date, workers);
  }

  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, workers]) => {
      const list = [...workers.values()].sort((a, b) => a.worker.name.localeCompare(b.worker.name, 'pl'));
      return {
        date,
        status: null,
        totals: { workers: list.length, hours: round(list.reduce((s, w) => s + w.hours, 0)) },
        workers: list,
      };
    });
}

/** Work type name → meaning (names as written by ST_BR) */
export function kindOf(name: string): RowKind {
  const n = norm(name);
  if (/pijanstwo/.test(n)) return 'penalty';
  if (/^absencja/.test(n)) return 'absence';
  if (/^zwolnion/.test(n)) return 'dismissed';
  if (/^chor/.test(n)) return 'sick';
  if (/^urlop/.test(n)) return 'vacation';
  if (/^wolne/.test(n)) return 'day_off';
  if (/dodatkow|\binne\b/.test(n)) return 'extra';
  return 'work';
}

function norm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/\s+/g, ' ')
    .trim();
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const round = (n: number) => Math.round(n * 100) / 100;

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
