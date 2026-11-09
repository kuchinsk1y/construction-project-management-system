import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TIMEOUT_MS = 8_000;

/**
 * Sends the sign-in code to the foreman's Telegram through the bot (Bot API sendMessage).
 * Bot token: TELEGRAM_AUTH_BOT_TOKEN, or the bug-report bot TELEGRAM_BOT_TOKEN when it is the same bot.
 *
 * Outside production a missing token or a Telegram error does not block sign-in:
 * the code is written to the API log instead ([DEV] …), so the app can be tried locally.
 */
@Injectable()
export class TelegramCodeSender {
  private readonly logger = new Logger(TelegramCodeSender.name);

  constructor(private readonly config: ConfigService) {}

  async send(telegramId: string, code: string, firstName: string, phone: string): Promise<void> {
    const token =
      this.config.get<string>('TELEGRAM_AUTH_BOT_TOKEN')?.trim() || this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    const production = process.env.NODE_ENV === 'production';

    if (!token) {
      if (production) throw new BadGatewayException('Wysyłka kodu przez Telegram nie jest skonfigurowana');
      this.logger.warn(`[DEV] TELEGRAM_AUTH_BOT_TOKEN is empty. Login code for ${phone}: ${code}`);
      return;
    }

    const text = [
      `Cześć ${escapeHtml(firstName)}!`,
      '',
      `Twój kod logowania do Dziennika brygadzisty: <code>${code}</code>`,
      '',
      'Kod jest ważny 10 minut. Jeśli to nie Ty, zignoruj tę wiadomość.',
    ].join('\n');

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramId, text, parse_mode: 'HTML' }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { description?: string } | null;
        throw new Error(`Telegram ${response.status}: ${body?.description ?? 'unknown error'}`);
      }
    } catch (error) {
      this.logger.error(`Sending login code to Telegram failed: ${(error as Error).message}`);
      if (production) throw new BadGatewayException('Nie udało się wysłać kodu przez Telegram. Spróbuj ponownie.');
      this.logger.warn(`[DEV] Login code for ${phone}: ${code}`);
    }
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
