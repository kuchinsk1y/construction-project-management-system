import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt } from 'crypto';
import { BRIGADE_AUDIENCE, type BrigadeForeman } from '../auth/access';
import { PrismaService } from '../prisma/prisma.service';
import { endOfDayInTimeZone } from './end-of-day';
import { TelegramCodeSender } from './telegram-code.sender';
import { TmaBrigadeClient } from './tma/tma-brigade.client';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TTL_MS = 10 * 60 * 1000;
/** A new code at most every 45 s, and at most 5 per 15 minutes */
const RESEND_PAUSE_MS = 45 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CODES_PER_WINDOW = 5;
/** Wrong guesses before the code is burned */
const MAX_ATTEMPTS = 5;

export type BrigadeTokens = { accessToken: string; refreshToken: string; expiresAt: string };

type SessionRow = { id: string; foreman_external_id: string; phone: string; first_name: string; last_name: string };

/**
 * Sign-in of the brigade app. Foremen are not ERP users:
 * phone → TMA says it is a foreman (with his Telegram, crew and projects) → code to that Telegram →
 * code checked here → session until 23:59 (Warsaw). A new day means a new sign-in.
 */
@Injectable()
export class BrigadeAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tma: TmaBrigadeClient,
    private readonly telegram: TelegramCodeSender,
  ) {}

  async sendCode(rawPhone: string, userAgent: string) {
    const phone = normalizePhone(rawPhone);
    await this.assertSendAllowed(phone);

    const card = await this.tma.foremanByPhone(phone, true);
    if (!card) throw new ForbiddenException('Ten numer nie należy do brygadzisty');
    if (!card.foreman.telegramId) throw new ForbiddenException('Brygadzista nie ma połączonego konta Telegram');

    const code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    // Send first: if Telegram does not deliver, the previous valid code keeps working
    await this.telegram.send(card.foreman.telegramId, code, card.foreman.firstName, phone);

    await this.prisma.$transaction([
      this.prisma.brigade_auth_codes.updateMany({ where: { phone, used_at: null }, data: { used_at: new Date() } }),
      this.prisma.brigade_auth_codes.create({
        data: {
          phone,
          code,
          foreman_external_id: card.foreman.id,
          expires_at: new Date(Date.now() + CODE_TTL_MS),
          user_agent: cut(userAgent),
        },
      }),
    ]);
    return { message: 'Kod został wysłany na Telegram' };
  }

  async verifyCode(rawPhone: string, rawCode: string, userAgent: string): Promise<BrigadeTokens> {
    const phone = normalizePhone(rawPhone);
    const active = await this.prisma.brigade_auth_codes.findFirst({
      where: { phone, used_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
    if (!active) throw new UnauthorizedException('Nieprawidłowy lub wygasły kod');

    if (active.code !== rawCode.trim().toUpperCase()) {
      const attempts = active.attempts + 1;
      await this.prisma.brigade_auth_codes.update({
        where: { id: active.id },
        data: { attempts, used_at: attempts >= MAX_ATTEMPTS ? new Date() : null },
      });
      if (attempts >= MAX_ATTEMPTS) {
        throw new HttpException('Zbyt wiele błędnych prób. Wyślij nowy kod.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new UnauthorizedException('Nieprawidłowy lub wygasły kod');
    }
    await this.prisma.brigade_auth_codes.update({ where: { id: active.id }, data: { used_at: new Date() } });

    // Still a foreman? (TMA answers from cache if asked a moment ago)
    const card = await this.tma.foremanByPhone(phone);
    if (!card || card.foreman.id !== active.foreman_external_id) throw new ForbiddenException('Ten numer nie należy do brygadzisty');

    const session = await this.prisma.brigade_sessions.create({
      data: {
        foreman_external_id: card.foreman.id,
        phone,
        first_name: card.foreman.firstName,
        last_name: card.foreman.lastName,
        refresh_token: newRefreshToken(),
        expires_at: endOfDayInTimeZone(this.timeZone),
        user_agent: cut(userAgent),
      },
    });
    return this.tokens(session, session.refresh_token, session.expires_at);
  }

  /** New pair of tokens for the same session; it still ends at the same 23:59 */
  async refresh(refreshToken: string, userAgent: string): Promise<BrigadeTokens> {
    const session = await this.prisma.brigade_sessions.findUnique({ where: { refresh_token: refreshToken } });
    if (!session || session.revoked_at || session.expires_at < new Date()) {
      throw new UnauthorizedException('Sesja wygasła. Zaloguj się ponownie.');
    }
    const next = newRefreshToken();
    // Rotation: the old refresh token works once
    const updated = await this.prisma.brigade_sessions.updateMany({
      where: { id: session.id, refresh_token: refreshToken },
      data: { refresh_token: next, user_agent: cut(userAgent) },
    });
    if (updated.count !== 1) throw new UnauthorizedException('Sesja wygasła. Zaloguj się ponownie.');
    return this.tokens(session, next, session.expires_at);
  }

  async logout(refreshToken: string) {
    await this.prisma.brigade_sessions.updateMany({
      where: { refresh_token: refreshToken, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  me(foreman: BrigadeForeman) {
    return { id: foreman.id, firstName: foreman.firstName, lastName: foreman.lastName, phone: foreman.phone };
  }

  private get timeZone() {
    return this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
  }

  private tokens(session: SessionRow, refreshToken: string, expiresAt: Date): BrigadeTokens {
    const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (seconds <= 0) throw new UnauthorizedException('Sesja wygasła. Zaloguj się ponownie.');
    const accessToken = this.jwt.sign(
      {
        sub: session.foreman_external_id,
        sid: session.id,
        phone: session.phone,
        firstName: session.first_name,
        lastName: session.last_name,
      },
      { audience: BRIGADE_AUDIENCE, expiresIn: seconds },
    );
    return { accessToken, refreshToken, expiresAt: expiresAt.toISOString() };
  }

  /** Too many codes requested: wait before the next one */
  private async assertSendAllowed(phone: string) {
    const recent = await this.prisma.brigade_auth_codes.findMany({
      where: { phone, created_at: { gt: new Date(Date.now() - WINDOW_MS) } },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });
    const sinceLast = recent[0] ? Date.now() - recent[0].created_at.getTime() : Infinity;
    if (sinceLast < RESEND_PAUSE_MS) {
      const wait = Math.ceil((RESEND_PAUSE_MS - sinceLast) / 1000);
      throw new HttpException(`Odczekaj ${wait} s przed wysłaniem nowego kodu`, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (recent.length >= MAX_CODES_PER_WINDOW) {
      throw new HttpException('Zbyt wiele prób. Spróbuj ponownie za 15 minut.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}

/** "+48 123-456 789" → "+48123456789" */
export function normalizePhone(raw: string) {
  return `+${raw.replace(/\D/g, '')}`;
}

const newRefreshToken = () => randomBytes(32).toString('base64url');
const cut = (userAgent: string) => (userAgent || 'unknown').slice(0, 255);
