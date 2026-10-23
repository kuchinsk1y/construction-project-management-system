import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Live attendance as returned by TMA: GET {TMA_API_URL}/v1/integration/attendance/live */
export type TmaAttendanceTotals = {
  members: number;
  present: number;
  absent: number;
  notMarked: number;
  closed: number;
};

export type TmaAttendanceMember = {
  externalId: string;
  name: string;
  position: string | null;
  status: 'not_marked' | 'open' | 'close_requested' | 'closed' | 'auto_closed' | 'absent';
  checkInAt: string | null;
  checkInMethod: 'qr' | 'manual' | 'self' | null;
  manualReason: string | null;
  absenceReason: { code: string; name: string } | null;
  absenceComment: string | null;
  closeRequestedAt: string | null;
  closedAt: string | null;
  closeMethod: string | null;
  workDescription: string | null;
  distanceToSiteM: number | null;
};

export type TmaAttendanceLive = {
  date: string;
  generatedAt: string;
  brigades: {
    id: number;
    name: string;
    projectId: string | null;
    foreman: { externalId: string; name: string } | null;
    lastSessionAt: string | null;
    members: TmaAttendanceMember[];
    totals: TmaAttendanceTotals;
  }[];
  totals: TmaAttendanceTotals;
};

export type AttendanceQuery = { projectId?: string; managerErpId?: number; date?: string };

const CACHE_TTL_MS = 15_000;
const TIMEOUT_MS = 5_000;

/**
 * Client for the TMA integration API. ERP does not store attendance; it proxies TMA
 * with a short in-memory cache so several people watching one project hit TMA once.
 */
@Injectable()
export class TmaClient {
  private readonly logger = new Logger(TmaClient.name);
  private readonly cache = new Map<string, { at: number; data: TmaAttendanceLive }>();

  constructor(private readonly config: ConfigService) {}

  private settings() {
    const baseUrl = this.config.get<string>('TMA_API_URL')?.trim().replace(/\/+$/, '');
    const apiKey = this.config.get<string>('TMA_API_KEY')?.trim();
    if (!baseUrl || !apiKey) {
      throw new HttpException(
        { code: 'TMA_NOT_CONFIGURED', message: 'Integracja z TMA nie jest skonfigurowana' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { baseUrl, apiKey };
  }

  async liveAttendance(query: AttendanceQuery): Promise<TmaAttendanceLive> {
    const { baseUrl, apiKey } = this.settings();

    const params = new URLSearchParams();
    if (query.projectId) params.set('projectId', query.projectId);
    if (query.managerErpId) params.set('managerErpId', String(query.managerErpId));
    if (query.date) params.set('date', query.date);
    const key = params.toString();

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/integration/attendance/live?${key}`, {
        headers: { 'x-api-key': apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`TMA request failed: ${(error as Error).message}`);
      throw this.unavailable();
    }

    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
      const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
      throw new HttpException(
        {
          code: 'TMA_BAD_REQUEST',
          message: typeof message === 'string' ? message : 'Nieprawidłowe zapytanie do TMA',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!response.ok) {
      this.logger.warn(`TMA responded ${response.status} for attendance/live`);
      throw this.unavailable();
    }

    const data = (await response.json()) as TmaAttendanceLive;
    this.cache.set(key, { at: Date.now(), data });
    this.pruneCache();
    return data;
  }

  private unavailable() {
    return new HttpException(
      { code: 'TMA_UNAVAILABLE', message: 'TMA jest chwilowo niedostępna' },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private pruneCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.at >= CACHE_TTL_MS) this.cache.delete(key);
    }
  }
}
