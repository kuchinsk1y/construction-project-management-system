import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BrigadeForeman } from '../auth/access';

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
  /** "none": entries are not stored yet (they will be in ERP), so there are no days */
  source: 'none' | 'erp';
  generatedAt: string;
  days: Array<{
    date: string;
    /** Approval of the day (ERP); null for now */
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
 * Entries are not saved anywhere yet (the Google journal of ST_BR is no longer read),
 * so the answer has no days until they are stored in ERP. The format stays the same.
 */
@Injectable()
export class WorkLogService {
  constructor(private readonly config: ConfigService) {}

  get(_foreman: BrigadeForeman, days: number): WorkLog {
    const to = this.today();
    const d = new Date(`${to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (days - 1));
    return { from: d.toISOString().slice(0, 10), to, source: 'none', generatedAt: new Date().toISOString(), days: [] };
  }

  private today() {
    const timeZone = this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}

/** Work type name → meaning (Urlop, Chory, Pijaństwo… are not work) */
export function kindOf(name: string): RowKind {
  const n = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .trim();
  if (/pijanstwo/.test(n)) return 'penalty';
  if (/^absencja/.test(n)) return 'absence';
  if (/^zwolnion/.test(n)) return 'dismissed';
  if (/^chor/.test(n)) return 'sick';
  if (/^urlop/.test(n)) return 'vacation';
  if (/^wolne/.test(n)) return 'day_off';
  if (/dodatkow|\binne\b/.test(n)) return 'extra';
  return 'work';
}
