import { Injectable, Logger, ServiceUnavailableException, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, type sheets_v4 } from 'googleapis';
import { join } from 'path';

/** A sheet of the former ST_BR app: env names of its spreadsheet id and tab, and the header row */
export type StBrSheet = { key: string; idEnv: string; nameEnv: string; headersRow: number };

export const ST_BR_SHEETS = {
  workJournal: { key: 'work-journal', idEnv: 'STBR_WORK_JOURNAL_SPREADSHEET_ID', nameEnv: 'STBR_WORK_JOURNAL_SHEET_NAME', headersRow: 1 },
  employeesIspik: {
    key: 'employees-ispik',
    idEnv: 'STBR_EMPLOYEES_ISPIK_SPREADSHEET_ID',
    nameEnv: 'STBR_EMPLOYEES_ISPIK_SHEET_NAME',
    headersRow: 2,
  },
  employeesIspikLv: {
    key: 'employees-ispik-lv',
    idEnv: 'STBR_EMPLOYEES_ISPIK_LV_SPREADSHEET_ID',
    nameEnv: 'STBR_EMPLOYEES_ISPIK_LV_SHEET_NAME',
    headersRow: 2,
  },
  employeesAgencies: {
    key: 'employees-agencies',
    idEnv: 'STBR_EMPLOYEES_AGENCIES_SPREADSHEET_ID',
    nameEnv: 'STBR_EMPLOYEES_AGENCIES_SHEET_NAME',
    headersRow: 1,
  },
  vacations: { key: 'vacations', idEnv: 'STBR_VACATION_SPREADSHEET_ID', nameEnv: 'STBR_VACATION_SHEET_NAME', headersRow: 1 },
  resignations: { key: 'resignations', idEnv: 'STBR_RESIGNATION_SPREADSHEET_ID', nameEnv: 'STBR_RESIGNATION_SHEET_NAME', headersRow: 1 },
} satisfies Record<string, StBrSheet>;

export type SheetRow = Record<string, unknown>;

/** After this the headers are re-read in the background; the old ones are used meanwhile */
const HEADERS_TTL_MS = 60 * 60 * 1000;
/** Big sheets (the work journal) sometimes answer slowly, especially the first request */
const TIMEOUT_MS = 30_000;
const RETRY_PAUSE_MS = 1_500;

/**
 * Reads the Google Sheets that ST_BR used (employees, work journal), the same way ST_BR did:
 * header row through the Sheets API (exact header text → column letter), data through a gviz query.
 * Separate from the ERP sync service on purpose, so the ERP sync is not affected.
 */
@Injectable()
export class StBrSheetsClient implements OnApplicationBootstrap {
  private readonly logger = new Logger(StBrSheetsClient.name);
  private readonly auth: InstanceType<typeof google.auth.GoogleAuth>;
  private sheets?: sheets_v4.Sheets;
  private readonly headers = new Map<string, { at: number; columns: Record<string, string> }>();
  /** One header request per sheet at a time */
  private readonly loading = new Map<string, Promise<Record<string, string>>>();

  constructor(private readonly config: ConfigService) {
    const keyFile = this.config.get<string>('GOOGLE_CREDENTIALS_FILE', 'google-credentials.json');
    this.auth = new google.auth.GoogleAuth({
      keyFile: join(process.cwd(), keyFile),
      // gviz (docs.google.com) needs a Drive scope; read-only is enough here
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
    });
  }

  /** Reads the headers right after start, so the first foreman does not wait for Google (does not block the start) */
  onApplicationBootstrap() {
    for (const sheet of Object.values(ST_BR_SHEETS)) {
      if (!this.config.get<string>(sheet.idEnv)?.trim() || !this.config.get<string>(sheet.nameEnv)?.trim()) continue;
      this.columns(sheet, this.target(sheet)).catch(() => undefined);
    }
  }

  /**
   * Runs a gviz query. `build` gets header → column letter and returns the query
   * (or null when a needed column is missing — then it fails with 503, the headers were renamed).
   */
  async query(sheet: StBrSheet, build: (columns: Record<string, string>) => string | null): Promise<SheetRow[]> {
    const target = this.target(sheet);
    const columns = await this.columns(sheet, target);
    const tq = build(columns);
    if (!tq) {
      this.logger.error(`Sheet "${target.name}": needed columns not found, check the headers`);
      this.headers.delete(sheet.key);
      throw new ServiceUnavailableException(`Arkusz "${target.name}": brak wymaganych kolumn`);
    }

    const token = await this.token();
    const url = new URL(`https://docs.google.com/spreadsheets/d/${target.id}/gviz/tq`);
    url.searchParams.set('sheet', target.name);
    url.searchParams.set('headers', String(sheet.headersRow));
    url.searchParams.set('tq', tq);

    let text: string;
    try {
      text = await withRetry(async () => {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        const body = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return body;
      });
    } catch (error) {
      this.logger.error(`Sheet "${target.name}" query failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Nie udało się pobrać danych z Google Sheets');
    }
    return parseGviz(text, target.name);
  }

  /** Column letter shifted by `offset` (for tables with merged headers): offset('D', 4) === 'H' */
  static offset(letter: string, offset: number) {
    return indexToLetter(letterToIndex(letter) + offset);
  }

  private target(sheet: StBrSheet) {
    const id = this.config.get<string>(sheet.idEnv)?.trim();
    const name = this.config.get<string>(sheet.nameEnv)?.trim();
    if (!id || !name) {
      this.logger.error(`${sheet.idEnv} / ${sheet.nameEnv} are not set`);
      throw new ServiceUnavailableException('Arkusze Google brygady nie są skonfigurowane');
    }
    return { id, name };
  }

  private async columns(sheet: StBrSheet, target: { id: string; name: string }): Promise<Record<string, string>> {
    const cached = this.headers.get(sheet.key);
    if (cached) {
      // Old headers are served at once; a fresh copy is read in the background
      if (Date.now() - cached.at >= HEADERS_TTL_MS) this.readHeaders(sheet, target).catch(() => undefined);
      return cached.columns;
    }
    try {
      return await this.readHeaders(sheet, target);
    } catch {
      throw new ServiceUnavailableException('Nie udało się pobrać danych z Google Sheets');
    }
  }

  private readHeaders(sheet: StBrSheet, target: { id: string; name: string }) {
    const pending = this.loading.get(sheet.key);
    if (pending) return pending;

    const request = withRetry(async () => {
      this.sheets ??= google.sheets({ version: 'v4', auth: this.auth });
      const response = await this.sheets.spreadsheets.values.get(
        { spreadsheetId: target.id, range: `${target.name}!${sheet.headersRow}:${sheet.headersRow}` },
        { timeout: TIMEOUT_MS },
      );
      return (response.data.values?.[0] ?? []) as unknown[];
    })
      .then((row) => {
        const columns: Record<string, string> = {};
        row.forEach((header, index) => {
          const text = String(header ?? '').trim();
          if (text && !(text in columns)) columns[text] = indexToLetter(index);
        });
        this.headers.set(sheet.key, { at: Date.now(), columns });
        return columns;
      })
      .catch((error: Error) => {
        const old = this.headers.has(sheet.key);
        this.logger[old ? 'warn' : 'error'](
          `Sheet "${target.name}": reading headers failed${old ? ', keeping the old ones' : ''}: ${error.message}`,
        );
        throw error;
      })
      .finally(() => this.loading.delete(sheet.key));
    this.loading.set(sheet.key, request);
    return request;
  }

  private async token() {
    try {
      const client = await this.auth.getClient();
      const { token } = await client.getAccessToken();
      if (!token) throw new Error('empty token');
      return token;
    } catch (error) {
      this.logger.error(`Google auth failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Nie udało się połączyć z Google Sheets');
    }
  }
}

/** Google sometimes stalls or drops a request: one more try after a short pause */
async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, RETRY_PAUSE_MS));
    return run();
  }
}

/** Escapes a value for a gviz string literal */
export function gvizText(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

type GvizCell = { v?: unknown; f?: string } | null;

function parseGviz(text: string, sheetName: string): SheetRow[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return [];
  const json = JSON.parse(text.slice(start, end + 1)) as {
    status?: string;
    errors?: unknown;
    table?: { cols?: Array<{ label?: string; id?: string }>; rows?: Array<{ c?: GvizCell[] }> };
  };
  if (json.status === 'error') {
    throw new ServiceUnavailableException(`Google Sheets: błąd zapytania do arkusza "${sheetName}"`);
  }
  const cols = json.table?.cols ?? [];
  return (json.table?.rows ?? []).map((row) => {
    const item: SheetRow = {};
    cols.forEach((col, i) => {
      item[col.label || col.id || `col_${i}`] = cellValue(row.c?.[i] ?? null);
    });
    return item;
  });
}

/** gviz dates come as "Date(2026,10,8)" (month from 0): turned into "2026-11-08" */
function cellValue(cell: GvizCell): unknown {
  if (!cell || cell.v === null || cell.v === undefined) return null;
  if (typeof cell.v === 'string') {
    const m = /^Date\((\d+),(\d+),(\d+)/.exec(cell.v);
    if (m) return `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  return cell.v;
}

function letterToIndex(letter: string) {
  let index = 0;
  for (const ch of letter) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

function indexToLetter(index: number) {
  let n = index;
  let letter = '';
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}
