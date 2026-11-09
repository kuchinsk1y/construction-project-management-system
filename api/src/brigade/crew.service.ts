import { Injectable } from '@nestjs/common';
import { ST_BR_SHEETS, StBrSheetsClient, gvizText } from './sheets/st-br-sheets.client';

const CACHE_TTL_MS = 60_000;

/** A person of the foreman's crew, as in the ST_BR employee sheets */
export type CrewWorker = {
  /** Company + id: ids of the ISPIK and agency sheets can repeat */
  key: string;
  id: string;
  name: string;
  company: string;
  position: string;
  /** Hourly rate («indeks»); null when the sheet has none (agencies) */
  rate: number | null;
};

/**
 * Crew of a foreman from the three ST_BR sheets (ISPIK, ISPIK Łotwa, agencies), matched by the foreman's
 * last name with the same filters as ST_BR. One person in several sheets is counted once. Cached for a minute.
 */
@Injectable()
export class CrewService {
  private readonly cache = new Map<string, { at: number; data: CrewWorker[] }>();
  private readonly inFlight = new Map<string, Promise<CrewWorker[]>>();

  constructor(private readonly sheets: StBrSheetsClient) {}

  get(lastName: string, fresh = false): Promise<CrewWorker[]> {
    const key = lastName.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (!fresh && cached && Date.now() - cached.at < CACHE_TTL_MS) return Promise.resolve(cached.data);
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const request = Promise.all([this.ispik(lastName), this.ispikLv(lastName), this.agencies(lastName)])
      .then((sources) => {
        const seen = new Set<string>();
        const data = sources.flat().filter((w) => w.id && !seen.has(w.id) && seen.add(w.id));
        for (const [k, entry] of this.cache) if (Date.now() - entry.at >= CACHE_TTL_MS) this.cache.delete(k);
        this.cache.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  private async ispik(lastName: string): Promise<CrewWorker[]> {
    const rows = await this.sheets.query(ST_BR_SHEETS.employeesIspik, (c) => {
      const cols = {
        id: c['id'],
        name: c['parsed name'],
        position: c['stanowisko (fakt)'],
        rate: c['indeks'],
        foreman: c['kierownik bezpośredni'],
        status: c['status kandydata co do podjęcia pracy'],
        ended: c['informacja o okończeniu pracy z tym pozwoleniem'],
      };
      if (Object.values(cols).some((v) => !v)) return null;
      return (
        `select ${cols.id}, ${cols.name}, ${cols.position}, ${cols.rate} ` +
        `where ${cols.foreman} = ${gvizText(lastName)} and ${cols.status} = 'podjął pracę' and ${cols.ended} is null ` +
        `label ${cols.id} 'id', ${cols.name} 'name', ${cols.position} 'position', ${cols.rate} 'rate'`
      );
    });
    return rows.map((r) => worker(r, 'ISPIK'));
  }

  private async ispikLv(lastName: string): Promise<CrewWorker[]> {
    const rows = await this.sheets.query(ST_BR_SHEETS.employeesIspikLv, (c) => {
      const [id, name, history, status] = [
        c['id'],
        c['имя и фамилия'],
        c['история трудоустройства'],
        c['статус кандидата относительно трудоустройства'],
      ];
      if (!id || !name || !history || !status) return null;
      // Merged header: foreman, position and rate are the 3rd, 5th and 6th columns of the "history" block
      const foreman = StBrSheetsClient.offset(history, 2);
      const position = StBrSheetsClient.offset(history, 4);
      const rate = StBrSheetsClient.offset(history, 5);
      return (
        `select ${id}, ${name}, ${position}, ${rate} ` +
        `where ${foreman} = ${gvizText(lastName)} and ${status} = 'приступил к работе' ` +
        `label ${id} 'id', ${name} 'name', ${position} 'position', ${rate} 'rate'`
      );
    });
    return rows.map((r) => worker(r, 'ISPIK Latvia'));
  }

  private async agencies(lastName: string): Promise<CrewWorker[]> {
    const rows = await this.sheets.query(ST_BR_SHEETS.employeesAgencies, (c) => {
      const cols = {
        id: c['id'],
        last: c['lastName'],
        first: c['firstName'],
        position: c['position'],
        company: c['company'],
        foreman: c['foreman'],
      };
      if (Object.values(cols).some((v) => !v)) return null;
      const middle = c['middleNames'];
      const picked: Array<[string, string]> = [
        [cols.id, 'id'],
        [cols.last, 'last'],
        [cols.first, 'first'],
        [cols.position, 'position'],
        [cols.company, 'company'],
      ];
      if (middle) picked.push([middle, 'middle']);
      return (
        `select ${picked.map(([col]) => col).join(', ')} where ${cols.foreman} = ${gvizText(lastName)} ` +
        `label ${picked.map(([col, label]) => `${col} '${label}'`).join(', ')}`
      );
    });
    return rows.map((r) => {
      const name = [r.last, r.first, r.middle].map(text).filter(Boolean).join(' ');
      return worker({ id: r.id, name, position: r.position, rate: null }, text(r.company) || 'Agencja');
    });
  }
}

function worker(r: Record<string, unknown>, company: string): CrewWorker {
  const id = text(r.id);
  const rate = Number(String(r.rate ?? '').replace(',', '.'));
  return {
    key: `${company}:${id}`,
    id,
    name: text(r.name) || '—',
    company,
    position: text(r.position),
    rate: r.rate !== null && r.rate !== undefined && r.rate !== '' && Number.isFinite(rate) ? rate : null,
  };
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}
