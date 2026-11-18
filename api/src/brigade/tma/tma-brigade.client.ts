import { createHash } from 'crypto';
import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { readMock, type MockContext, type MockFile } from './tma-mock';
import type {
  TmaAbsence,
  TmaAbsenceType,
  TmaCheckIn,
  TmaCheckInStatus,
  TmaCheckInsDay,
  TmaForemanCard,
  TmaWorker,
} from './tma-brigade.types';

const TIMEOUT_MS = 8_000;
const CARD_TTL_MS = 60_000;
const DONE_PROJECT_STATUSES = ['COMPLETED', 'DONE', 'ARCHIVED'];
const ABSENCE_TYPES: TmaAbsenceType[] = ['vacation', 'sick', 'day_off', 'absence', 'drunk', 'drunk_on_site', 'dismissed'];
const CHECK_IN_STATUSES: TmaCheckInStatus[] = ['open', 'close_requested', 'closed', 'auto_closed'];
const CHECK_IN_METHODS: Array<TmaCheckIn['checkInMethod']> = ['qr', 'manual', 'self'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Everything about foremen comes from TMA: who is a foreman (by phone), his Telegram, crew, projects,
 * absences, open days and QR check-ins. Contract: tma-brigade.types.ts.
 *
 * BRIGADE_TMA_MODE=mock (development only): answers are read from ./mock/*.json (same format as TMA)
 * and go through the same parsing; only BRIGADE_MOCK_PHONE is a foreman. The API refuses to start with the mock in production.
 */
@Injectable()
export class TmaBrigadeClient implements OnModuleInit {
  private readonly logger = new Logger(TmaBrigadeClient.name);
  private readonly cards = new Map<string, { at: number; card: TmaForemanCard | null }>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get isMock() {
    const mode = (this.config.get<string>('BRIGADE_TMA_MODE') ?? 'http').trim().toLowerCase();
    return mode === 'mock' || mode === 'stub';
  }

  onModuleInit() {
    if (this.isMock && process.env.NODE_ENV === 'production') {
      throw new Error('BRIGADE_TMA_MODE=mock is not allowed in production: made-up foremen and crews');
    }
    if (this.isMock) {
      this.logger.warn(`Brigade app uses TMA mock data (src/brigade/tma/mock): foreman = ${this.mockPhone ?? '(BRIGADE_MOCK_PHONE not set)'}`);
    }
  }

  /** Foreman with crew and projects, or null when the number is not a foreman. Cached for a minute. */
  async foremanByPhone(phone: string, fresh = false): Promise<TmaForemanCard | null> {
    const key = digits(phone);
    const cached = this.cards.get(key);
    if (!fresh && cached && Date.now() - cached.at < CARD_TTL_MS) return cached.card;

    let body: unknown;
    if (this.isMock) {
      // Only one number is a foreman in the mock
      body = this.mockPhone && digits(phone) === digits(this.mockPhone) ? await this.mock('foreman-check') : null;
    } else {
      const { url, apiKey } = this.target('TMA_FOREMAN_CHECK_PATH', '/v1/integration/foremen/check');
      body = await this.request(`${url}?phone=${encodeURIComponent(phone)}`, apiKey, 'foreman check', true);
    }
    const card = parseCard(body, phone);

    for (const [k, entry] of this.cards) if (Date.now() - entry.at >= CARD_TTL_MS) this.cards.delete(k);
    this.cards.set(key, { at: Date.now(), card });
    return card;
  }

  /** Absences of the foreman's crew that touch the period (dates inclusive) */
  async absences(foremanId: string, dateFrom: string, dateTo: string): Promise<TmaAbsence[]> {
    const body = this.isMock
      ? await this.mock('absences')
      : await this.request(this.periodUrl('TMA_FOREMAN_ABSENCES_PATH', '/v1/integration/foremen/:id/absences', foremanId, dateFrom, dateTo), this.apiKey(), 'absences');
    return parseAbsences(body).filter((a) => a.dateFrom <= dateTo && a.dateTo >= dateFrom);
  }

  /** Days of the period the foreman may fill in (YYYY-MM-DD, sorted) */
  async openDays(foremanId: string, dateFrom: string, dateTo: string): Promise<string[]> {
    const body = this.isMock
      ? await this.mock('open-days')
      : await this.request(this.periodUrl('TMA_FOREMAN_OPEN_DAYS_PATH', '/v1/integration/foremen/:id/open-days', foremanId, dateFrom, dateTo), this.apiKey(), 'open days');
    const raw = (body as { openDays?: unknown } | null)?.openDays;
    const days = (Array.isArray(raw) ? raw : []).map((d) => str(d).slice(0, 10)).filter((d) => DATE.test(d));
    return [...new Set(days)].filter((d) => d >= dateFrom && d <= dateTo).sort();
  }

  /** QR check-ins of the crew on one day: who started work on which project */
  async checkIns(foremanId: string, date: string): Promise<TmaCheckIn[]> {
    let body: unknown;
    if (this.isMock) {
      // The mock file holds several days (each one is a TMA answer)
      const days = (await this.mock('check-ins')) as unknown[];
      body = (Array.isArray(days) ? days : []).find((d) => str((d as { date?: unknown })?.date) === date) ?? (await this.mockCheckInsDay(date));
    } else {
      const { url, apiKey } = this.target('TMA_FOREMAN_CHECK_INS_PATH', '/v1/integration/foremen/:id/check-ins', foremanId);
      body = await this.request(`${url}?date=${date}`, apiKey, 'check-ins');
    }
    return parseCheckIns(body).checkIns;
  }

  // --- mock ---

  /**
   * Days not written in check-ins.json: everyone present checks in on his assigned project around 6:00,
   * so the form has people on every open day of the mock
   */
  private async mockCheckInsDay(date: string): Promise<TmaCheckInsDay> {
    const card = parseCard(await this.mock('foreman-check'), this.mockPhone ?? '');
    const absent = new Set(
      parseAbsences(await this.mock('absences'))
        .filter((a) => a.dateFrom <= date && a.dateTo >= date)
        .map((a) => a.workerId),
    );
    const present = (card?.crew ?? []).filter((w) => w.projectId && !absent.has(w.id))
    // Each person gets one of his project's work types and a short note, so the form is filled in
    const types = await this.prisma.project_work_types.findMany({
      where: { deleted_at: null, project_id: { in: [...new Set(present.map((w) => w.projectId!))] } },
      select: { id: true, project_id: true, name: true },
      orderBy: { name: 'asc' },
    })
    const notes = ['Montaż według planu', 'Prace przy fundamentach', 'Rozładunek materiału', null, 'Poprawki po odbiorze', null]
    const checkIns: TmaCheckIn[] = present.map((w, i) => {
      const own = types.filter((t) => t.project_id === w.projectId)
      return {
        // Same id on every read of the day, like a stored TMA event
        id: mockUuid(`${date}:${w.id}`),
        workerId: w.id,
        projectId: w.projectId!,
        status: 'closed',
        checkInAt: `${date}T05:${String(45 + (i % 15)).padStart(2, '0')}:00Z`,
        checkInMethod: 'qr',
        closedAt: `${date}T15:${String((i * 7) % 60).padStart(2, '0')}:00Z`,
        workTypeId: own.length ? own[i % own.length].id : null,
        workDescription: notes[i % notes.length],
      }
    });
    return { date, generatedAt: new Date().toISOString(), checkIns };
  }

  private get mockPhone() {
    const raw = this.config.get<string>('BRIGADE_MOCK_PHONE')?.trim();
    return raw ? `+${digits(raw)}` : null;
  }

  private async mock(file: MockFile): Promise<unknown> {
    // {{project:N}} = N-th active ERP project, most work types first (so the form has works to pick)
    const projects = await this.prisma.projects.findMany({
      where: { deleted_at: null, status: { notIn: DONE_PROJECT_STATUSES } },
      select: {
        id: true,
        name: true,
        project_work_types: { where: { deleted_at: null }, select: { id: true, name: true } },
      },
    });
    projects.sort((a, b) => b.project_work_types.length - a.project_work_types.length || a.name.localeCompare(b.name, 'pl'));
    const ctx: MockContext = {
      today: this.today(),
      projectIds: projects.map((p) => p.id),
      // Work types of each project in the same order as in the form (by name)
      workTypeIds: projects.map((p) =>
        [...p.project_work_types].sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true })).map((w) => w.id),
      ),
      phone: this.mockPhone ?? '',
      telegramId:
        this.config.get<string>('BRIGADE_MOCK_TELEGRAM_ID')?.trim() ||
        this.config.get<string>('TELEGRAM_ADMIN_ID')?.trim() ||
        // Nobody to send to: outside production the code still lands in the API log
        'dev-mock',
    };
    try {
      return readMock(file, ctx);
    } catch (error) {
      this.logger.error(`TMA mock ${file}.json could not be read: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Dane testowe TMA są uszkodzone.');
    }
  }

  // --- TMA over HTTP ---

  private apiKey() {
    const apiKey = this.config.get<string>('TMA_API_KEY')?.trim();
    if (!apiKey) throw new ServiceUnavailableException('Integracja z TMA nie jest skonfigurowana');
    return apiKey;
  }

  private target(pathEnv: string, fallback: string, foremanId?: string) {
    const baseUrl = this.config.get<string>('TMA_API_URL')?.trim().replace(/\/+$/, '');
    if (!baseUrl) throw new ServiceUnavailableException('Integracja z TMA nie jest skonfigurowana');
    const path = this.config.get<string>(pathEnv)?.trim() || fallback;
    const url = `${baseUrl}${foremanId ? path.replace(':id', encodeURIComponent(foremanId)) : path}`;
    return { url, apiKey: this.apiKey() };
  }

  private periodUrl(pathEnv: string, fallback: string, foremanId: string, dateFrom: string, dateTo: string) {
    return `${this.target(pathEnv, fallback, foremanId).url}?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  }

  /** GET JSON from TMA; 404 → null when `notFoundIsNull`, other errors → 503 */
  private async request(url: string, apiKey: string, what: string, notFoundIsNull = false): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, { headers: { 'x-api-key': apiKey, accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      this.logger.warn(`TMA ${what} failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('TMA jest chwilowo niedostępna. Spróbuj za chwilę.');
    }
    if (notFoundIsNull && response.status === 404) return null;
    if (!response.ok) {
      this.logger.warn(`TMA ${what} answered ${response.status}`);
      throw new ServiceUnavailableException('TMA jest chwilowo niedostępna. Spróbuj za chwilę.');
    }
    return response.json().catch(() => null);
  }

  private today() {
    const timeZone = this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  }
}

// --- parsing of TMA answers (real and mock) ---

function parseCard(body: unknown, phone: string): TmaForemanCard | null {
  const b = body as Record<string, unknown> | null;
  if (b?.isForeman !== true) return null;
  const f = (b.foreman ?? {}) as Record<string, unknown>;
  const id = str(f.id);
  if (!id) throw new ServiceUnavailableException('TMA zwróciła niepełne dane brygadzisty.');
  return {
    isForeman: true,
    foreman: { id, firstName: str(f.firstName), lastName: str(f.lastName), phone: str(f.phone) || phone, telegramId: str(f.telegramId) || null },
    crew: (Array.isArray(b.crew) ? b.crew : []).map(worker).filter((w): w is TmaWorker => !!w),
    projectIds: (Array.isArray(b.projectIds) ? b.projectIds : []).map(str).filter(Boolean),
  };
}

function worker(raw: Record<string, unknown>): TmaWorker | null {
  const id = str(raw?.id);
  if (!id) return null;
  const rate = Number(raw.rate);
  return {
    id,
    firstName: str(raw.firstName),
    lastName: str(raw.lastName),
    company: str(raw.company),
    position: str(raw.position),
    rate: raw.rate !== null && raw.rate !== undefined && raw.rate !== '' && Number.isFinite(rate) ? rate : null,
    projectId: str(raw.projectId) || null,
  };
}

function parseAbsences(body: unknown): TmaAbsence[] {
  const raw = (body as { absences?: unknown } | null)?.absences;
  return (Array.isArray(raw) ? raw : [])
    .map((a: Record<string, unknown>) => ({
      workerId: str(a.workerId),
      type: str(a.type) as TmaAbsenceType,
      dateFrom: str(a.dateFrom).slice(0, 10),
      dateTo: str(a.dateTo || a.dateFrom).slice(0, 10),
    }))
    .filter((a) => a.workerId && ABSENCE_TYPES.includes(a.type) && DATE.test(a.dateFrom) && DATE.test(a.dateTo));
}

function parseCheckIns(body: unknown): TmaCheckInsDay {
  const b = (body ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(b.checkIns) ? b.checkIns : [];
  return {
    date: str(b.date).slice(0, 10),
    generatedAt: str(b.generatedAt),
    checkIns: raw
      .map((c: Record<string, unknown>) => ({
        id: str(c.id),
        workerId: str(c.workerId),
        projectId: str(c.projectId),
        status: str(c.status) as TmaCheckInStatus,
        checkInAt: str(c.checkInAt),
        checkInMethod: (CHECK_IN_METHODS.includes(str(c.checkInMethod) as TmaCheckIn['checkInMethod']) ? str(c.checkInMethod) : 'qr') as TmaCheckIn['checkInMethod'],
        closedAt: str(c.closedAt) || null,
        workTypeId: str(c.workTypeId) || null,
        workDescription: str(c.workDescription) || null,
      }))
      .filter((c) => c.id && c.workerId && c.projectId && c.checkInAt && CHECK_IN_STATUSES.includes(c.status)),
  };
}

/** Stable uuid-shaped id for synthesized mock events */
function mockUuid(seed: string) {
  const h = createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function str(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

const digits = (phone: string) => phone.replace(/\D/g, '');
