import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BrigadeForeman } from '../auth/access';
import { PrismaService } from '../prisma/prisma.service';
import { CrewService, type CrewWorker } from './crew.service';

const HISTORY_DAYS = 14;

type CountItem = { name: string; count: number };

export type PulpitStats = {
  generatedAt: string;
  today: string;
  /** Crew from TMA */
  workers: {
    total: number;
    ispikPolska: { count: number; positions: CountItem[] };
    ispikLotwa: { count: number; positions: CountItem[] };
    agencies: { count: number; companies: CountItem[]; positions: CountItem[] };
  } | null;
  /**
   * Last 14 days of entries. `source: "none"` — entries are not stored anywhere yet (they will be in ERP),
   * so every day is empty.
   */
  activity: {
    source: 'none' | 'erp';
    latestEntryDate: string | null;
    daysWithoutEntry: number | null;
    days: Array<{ date: string; filled: boolean; workers: number; hours: number }>;
  } | null;
  /** Foreman's projects: ids from TMA, details from ERP */
  projects: Array<{ id: string; name: string; city: string; status: string; departments: string[] }>;
  /** Parts that could not be loaded (the rest is still shown) */
  warnings: string[];
};

/** Foreman's dashboard: crew and projects from TMA (+ project details from ERP) */
@Injectable()
export class PulpitService {
  private readonly logger = new Logger(PulpitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crew: CrewService,
    private readonly config: ConfigService,
  ) {}

  async get(foreman: BrigadeForeman, fresh = false): Promise<PulpitStats> {
    const today = this.today();
    const warnings: string[] = [];

    // A foreman who is no longer one gets 403 from here, which ends his use of the app
    const data = await this.crew.get(foreman, fresh);

    let projects: PulpitStats['projects'] = [];
    try {
      projects = await this.projects(data.projectIds);
    } catch (error) {
      this.logger.warn(`Pulpit of foreman ${foreman.id}: projects failed: ${(error as Error).message}`);
      warnings.push('Nie udało się pobrać obiektów z ERP.');
    }

    return {
      generatedAt: new Date().toISOString(),
      today,
      workers: buildCrew(data.crew),
      activity: emptyActivity(today),
      projects,
      warnings,
    };
  }

  private async projects(ids: string[]): Promise<PulpitStats['projects']> {
    const valid = ids.filter((id) => UUID.test(id));
    if (valid.length === 0) return [];
    const rows = await this.prisma.projects.findMany({
      where: { id: { in: valid }, deleted_at: null },
      select: { id: true, name: true, city: true, status: true, project_departments: { select: { departments: { select: { name: true } } } } },
    });
    return rows
      .map((p) => ({ id: p.id, name: p.name, city: p.city, status: p.status, departments: p.project_departments.map((d) => d.departments.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }

  private today() {
    const timeZone = this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- calculations ---

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

function countBy(workers: CrewWorker[], key: (w: CrewWorker) => string): CountItem[] {
  const counts = new Map<string, number>();
  for (const w of workers) counts.set(key(w), (counts.get(key(w)) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'));
}
const positions = (workers: CrewWorker[]) => countBy(workers, (w) => w.position || 'Brak stanowiska');

function buildCrew(all: CrewWorker[]): NonNullable<PulpitStats['workers']> {
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

/** No stored entries yet: 14 empty days */
function emptyActivity(today: string): NonNullable<PulpitStats['activity']> {
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i - HISTORY_DAYS + 1);
    return { date: d.toISOString().slice(0, 10), filled: false, workers: 0, hours: 0 };
  });
  return { source: 'none', latestEntryDate: null, daysWithoutEntry: null, days };
}
