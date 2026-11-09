import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ST_BR_SHEETS, StBrSheetsClient, gvizText, type SheetRow } from './sheets/st-br-sheets.client';
import { kindOf, type RowKind } from './work-log.service';

const CACHE_TTL_MS = 60_000;
/** More hours than this in a day is shown as overtime */
const OVERTIME_HOURS = 12;
const FIRST_MONTH = '2024-01';

/** Letter for a day without working hours: U urlop, C chory, W wolne, Z zwolniony, A absencja, K kara */
export type DayMark = 'U' | 'C' | 'W' | 'Z' | 'A' | 'K';
const MARKS: Partial<Record<RowKind, DayMark>> = {
  vacation: 'U',
  sick: 'C',
  day_off: 'W',
  dismissed: 'Z',
  absence: 'A',
  penalty: 'K',
};
/** When a day has several marks, the most important one is shown */
const MARK_PRIORITY: DayMark[] = ['K', 'A', 'Z', 'C', 'U', 'W'];

export type HoursReport = {
  month: string;
  /** Previous / next month that can be opened (null = none) */
  prevMonth: string | null;
  nextMonth: string | null;
  dates: string[];
  overtimeThreshold: number;
  source: 'sheets' | 'erp';
  generatedAt: string;
  filters: { companies: string[]; company: string | null };
  totals: { workers: number; hours: number };
  /** hours[i] and marks[i] belong to dates[i] */
  workers: Array<{
    key: string;
    id: string | null;
    name: string;
    company: string | null;
    hours: Array<number | null>;
    marks: Array<DayMark | null>;
    total: number;
  }>;
};

/**
 * Monthly hours of the foreman's people: worker × day of the month.
 * The foreman is the signed-in user. Everything is counted here; the app only draws it.
 */
@Injectable()
export class HoursReportService {
  private readonly cache = new Map<string, { at: number; rows: SheetRow[] }>();
  private readonly inFlight = new Map<string, Promise<SheetRow[]>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheets: StBrSheetsClient,
    private readonly config: ConfigService,
  ) {}

  async get(userId: number, month: string | undefined, company: string | undefined, fresh = false): Promise<HoursReport> {
    const current = this.today().slice(0, 7);
    const m = month?.trim() || current;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new BadRequestException('month: format RRRR-MM');
    if (m > current) throw new BadRequestException('Nie można otworzyć przyszłego miesiąca');
    if (m < FIRST_MONTH) throw new BadRequestException(`Raport jest dostępny od ${FIRST_MONTH}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, isActive: true },
    });
    if (!user?.isActive) throw new UnauthorizedException();

    const fullName = `${user.firstName.trim()} ${user.lastName.trim()}`;
    const rows = await this.rows(userId, fullName, m, fresh);
    return build(m, rows, company?.trim() || null, {
      prevMonth: m > FIRST_MONTH ? shiftMonth(m, -1) : null,
      nextMonth: m < current ? shiftMonth(m, 1) : null,
    });
  }

  /** Journal rows of the month (cached per foreman and month; the company filter is applied after) */
  private rows(userId: number, fullName: string, month: string, fresh: boolean): Promise<SheetRow[]> {
    const key = `${userId}|${month}`;
    const cached = this.cache.get(key);
    if (!fresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return Promise.resolve(cached.rows);
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const from = `${month}-01`;
    const to = shiftDate(`${shiftMonth(month, 1)}-01`, -1);
    const request = this.sheets
      .query(ST_BR_SHEETS.workJournal, (c) => {
        const need = { date: c['data_robot'], foreman: c['kierownik'], hours: c['ilosc_godzin'], workerName: c['pracownik'] };
        if (!need.date || !need.foreman || !need.hours || !need.workerName) return null;
        const optional = { workerId: c['id_pracownika'], company: c['firma'], workType: c['rodzaj_roboty'] };
        const picked = Object.entries({ date: need.date, hours: need.hours, workerName: need.workerName, ...optional }).filter(
          (e): e is [string, string] => !!e[1],
        );
        return (
          `select ${picked.map(([, col]) => col).join(', ')} ` +
          `where lower(${need.foreman}) = ${gvizText(fullName.toLowerCase())} ` +
          `and ${need.date} >= date '${from}' and ${need.date} <= date '${to}' ` +
          `label ${picked.map(([name, col]) => `${col} '${name}'`).join(', ')}`
        );
      })
      .then((rows) => {
        for (const [k, entry] of this.cache) if (Date.now() - entry.at >= CACHE_TTL_MS) this.cache.delete(k);
        this.cache.set(key, { at: Date.now(), rows });
        return rows;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  private today() {
    const timeZone = this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}

function build(
  month: string,
  rows: SheetRow[],
  company: string | null,
  nav: { prevMonth: string | null; nextMonth: string | null },
): HoursReport {
  const first = `${month}-01`;
  const days = Number(shiftDate(`${shiftMonth(month, 1)}-01`, -1).slice(8));
  const dates = Array.from({ length: days }, (_, i) => shiftDate(first, i));

  const companies = new Set<string>();
  const workers = new Map<string, { worker: HoursReport['workers'][number]; lastDate: string; marks: Array<Set<DayMark>> }>();

  for (const r of rows) {
    const date = text(r.date)?.slice(0, 10);
    const name = text(r.workerName);
    if (!date || !date.startsWith(month) || !name) continue;
    const rowCompany = text(r.company);
    if (rowCompany) companies.add(rowCompany);
    if (company && rowCompany !== company) continue;

    // Ids of different sheets (ISPIK, agencies) can repeat: the key includes the company
    const id = text(r.workerId);
    const key = id ? `${rowCompany ?? '?'}:${id}` : `name:${name.toLowerCase()}`;
    const entry = workers.get(key) ?? {
      worker: { key, id, name, company: rowCompany, hours: dates.map(() => null), marks: dates.map(() => null), total: 0 },
      lastDate: '',
      marks: dates.map(() => new Set<DayMark>()),
    };
    // The newest entry gives the name
    if (date >= entry.lastDate) {
      entry.lastDate = date;
      entry.worker.name = name;
      entry.worker.company = rowCompany;
    }

    const day = Number(date.slice(8)) - 1;
    const hours = num(r.hours) ?? 0;
    if (hours > 0) entry.worker.hours[day] = round((entry.worker.hours[day] ?? 0) + hours);
    const mark = MARKS[kindOf(text(r.workType) ?? '')];
    if (mark) entry.marks[day].add(mark);
    workers.set(key, entry);
  }

  const list = [...workers.values()].map(({ worker, marks }) => {
    // A mark only where there are no working hours that day
    worker.marks = marks.map((set, i) => (worker.hours[i] ? null : (MARK_PRIORITY.find((m) => set.has(m)) ?? null)));
    worker.total = round(worker.hours.reduce<number>((s, h) => s + (h ?? 0), 0));
    return worker;
  });
  list.sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  return {
    month,
    ...nav,
    dates,
    overtimeThreshold: OVERTIME_HOURS,
    source: 'sheets',
    generatedAt: new Date().toISOString(),
    filters: { companies: [...companies].sort((a, b) => a.localeCompare(b, 'pl')), company },
    totals: { workers: list.length, hours: round(list.reduce((s, w) => s + w.total, 0)) },
    workers: list,
  };
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

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
