import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BrigadeForeman } from '../auth/access';
import { CrewService } from './crew.service';
import { TmaBrigadeClient } from './tma/tma-brigade.client';
import type { TmaAbsenceType } from './tma/tma-brigade.types';
import { kindOf, type RowKind } from './work-log.service';

/** One entry of the month: worker, day, hours, kind of work */
type SheetRow = Record<string, unknown>;

const ABSENCE_NAMES: Record<TmaAbsenceType, string> = {
  vacation: 'Urlop',
  sick: 'Chory',
  day_off: 'Wolne',
  absence: 'Absencja',
  drunk: 'Pijaństwo',
  drunk_on_site: 'Pijaństwo budowa',
  dismissed: 'Zwolniony',
};
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
  /** "none": hours are not stored yet, only absences from TMA are shown */
  source: 'none' | 'erp';
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
 * The foreman is the signed-in one. Everything is counted here; the app only draws it.
 * Hours are not stored yet (the Google journal is no longer read): for now only absences from TMA are shown.
 */
@Injectable()
export class HoursReportService {
  constructor(
    private readonly crew: CrewService,
    private readonly tma: TmaBrigadeClient,
    private readonly config: ConfigService,
  ) {}

  async get(foreman: BrigadeForeman, month: string | undefined, company: string | undefined, fresh = false): Promise<HoursReport> {
    const current = this.today().slice(0, 7);
    const m = month?.trim() || current;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new BadRequestException('month: format RRRR-MM');
    if (m > current) throw new BadRequestException('Nie można otworzyć przyszłego miesiąca');
    if (m < FIRST_MONTH) throw new BadRequestException(`Raport jest dostępny od ${FIRST_MONTH}`);

    const rows = await this.rows(foreman, m, fresh);
    return build(m, rows, company?.trim() || null, {
      prevMonth: m > FIRST_MONTH ? shiftMonth(m, -1) : null,
      nextMonth: m < current ? shiftMonth(m, 1) : null,
    });
  }

  /** Entries of the month: for now one 0-hour row per absence day of a crew member (TMA) */
  private async rows(foreman: BrigadeForeman, month: string, fresh: boolean): Promise<SheetRow[]> {
    const from = `${month}-01`;
    const to = shiftDate(`${shiftMonth(month, 1)}-01`, -1);
    const [{ crew }, absences] = await Promise.all([this.crew.get(foreman, fresh), this.tma.absences(foreman.id, from, to)]);
    const byId = new Map(crew.map((w) => [w.id, w]));

    const rows: SheetRow[] = [];
    for (const a of absences) {
      const w = byId.get(a.workerId);
      if (!w) continue;
      for (let d = a.dateFrom < from ? from : a.dateFrom; d <= a.dateTo && d <= to; d = shiftDate(d, 1)) {
        rows.push({ date: d, hours: 0, workerId: w.id, workerName: w.name, company: w.company, workType: ABSENCE_NAMES[a.type] });
      }
    }
    return rows;
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
    source: 'none',
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
