import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ForemanCheck = { isForeman: boolean; telegramId: string | null };

const TIMEOUT_MS = 5_000;

/**
 * Asks TMA whether a phone number belongs to a foreman, and for his Telegram ID.
 * TMA only answers this question; codes and tokens are handled by ERP.
 *
 * Request:  GET {TMA_API_URL}{TMA_FOREMAN_CHECK_PATH}?phone=+48123456789   (header x-api-key: TMA_API_KEY)
 * Response: 200 { "isForeman": true, "telegramId": "123456789" }  — 404 means "not a foreman"
 *
 * BRIGADE_TMA_MODE=stub (development only) answers "yes" for every number with BRIGADE_STUB_TELEGRAM_ID;
 * the app refuses to start with the stub in production, otherwise anyone could sign in.
 */
@Injectable()
export class TmaForemanClient implements OnModuleInit {
  private readonly logger = new Logger(TmaForemanClient.name);

  constructor(private readonly config: ConfigService) {}

  private get isStub() {
    return (this.config.get<string>('BRIGADE_TMA_MODE') ?? 'http').trim().toLowerCase() === 'stub';
  }

  onModuleInit() {
    if (this.isStub && process.env.NODE_ENV === 'production') {
      throw new Error('BRIGADE_TMA_MODE=stub is not allowed in production: every phone number would be accepted as a foreman');
    }
    if (this.isStub) this.logger.warn('Brigade sign-in uses the TMA stub: every phone number counts as a foreman (development only)');
  }

  async checkForeman(phone: string): Promise<ForemanCheck> {
    if (this.isStub) {
      const telegramId =
        this.config.get<string>('BRIGADE_STUB_TELEGRAM_ID')?.trim() ||
        this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID')?.trim() ||
        this.config.get<string>('TELEGRAM_ADMIN_ID')?.trim() ||
        // Nobody to send to: without a bot token the code still lands in the API log
        'dev-stub';
      return { isForeman: true, telegramId };
    }

    const baseUrl = this.config.get<string>('TMA_API_URL')?.trim().replace(/\/+$/, '');
    const apiKey = this.config.get<string>('TMA_API_KEY')?.trim();
    const path = this.config.get<string>('TMA_FOREMAN_CHECK_PATH')?.trim() || '/v1/integration/foremen/check';
    if (!baseUrl || !apiKey) throw new ServiceUnavailableException('Integracja z TMA nie jest skonfigurowana');

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}?phone=${encodeURIComponent(phone)}`, {
        headers: { 'x-api-key': apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`TMA foreman check failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('TMA jest chwilowo niedostępna. Spróbuj za chwilę.');
    }

    if (response.status === 404) return { isForeman: false, telegramId: null };
    if (!response.ok) {
      this.logger.warn(`TMA foreman check answered ${response.status}`);
      throw new ServiceUnavailableException('TMA jest chwilowo niedostępna. Spróbuj za chwilę.');
    }

    const body = (await response.json().catch(() => null)) as { isForeman?: unknown; telegramId?: unknown } | null;
    const telegramId =
      typeof body?.telegramId === 'string' || typeof body?.telegramId === 'number' ? String(body.telegramId).trim() || null : null;
    return { isForeman: body?.isForeman === true, telegramId };
  }
}
