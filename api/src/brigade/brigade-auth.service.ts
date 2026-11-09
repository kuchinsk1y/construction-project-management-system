import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomInt, randomUUID } from 'crypto';
import { BRIGADE_AUDIENCE } from '../auth/access';
import { PrismaService } from '../prisma/prisma.service';
import { endOfDayInTimeZone } from './end-of-day';
import { TelegramCodeSender } from './telegram-code.sender';
import { TmaForemanClient } from './tma-foreman.client';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TTL_MS = 10 * 60 * 1000;
const CHANNEL = 'telegram';
const SCOPE = 'brigade';
/** A new code at most every 45 s, and at most 5 per 15 minutes */
const RESEND_PAUSE_MS = 45 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CODES_PER_WINDOW = 5;
/** Wrong guesses before the code is burned */
const MAX_ATTEMPTS = 5;

type Foreman = { id: number; firstName: string; lastName: string; phoneNumber: string; roles: string[] };

export type BrigadeTokens = { accessToken: string; refreshToken: string; expiresAt: string };

/**
 * Sign-in of the brigade app: phone → TMA confirms a foreman and gives his Telegram ID →
 * ERP sends a one-time code to that Telegram → code checked here → tokens valid until 23:59 (Warsaw).
 * A new day means a new sign-in. Codes and sessions are separate from the ERP e-mail sign-in.
 */
@Injectable()
export class BrigadeAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tma: TmaForemanClient,
    private readonly telegram: TelegramCodeSender,
  ) {}

  async sendCode(rawPhone: string, userAgent: string) {
    const phone = normalizePhone(rawPhone);
    const user = await this.findActiveUserByPhone(phone);
    if (!user) throw new NotFoundException('Użytkownik z podanym numerem telefonu nie istnieje lub jest nieaktywny');

    await this.assertSendAllowed(user.id);

    const check = await this.tma.checkForeman(phone);
    if (!check.isForeman) throw new ForbiddenException('Ten numer nie należy do brygadzisty');
    if (!check.telegramId) throw new ForbiddenException('Brygadzista nie ma połączonego konta Telegram');

    const code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    // Send first: if Telegram does not deliver, the previous valid code keeps working
    await this.telegram.send(check.telegramId, code, user.firstName, phone);

    await this.prisma.$transaction([
      this.prisma.authCode.updateMany({
        where: { userId: user.id, channel: CHANNEL, isUsed: false },
        data: { isUsed: true },
      }),
      this.prisma.authCode.create({
        data: {
          userId: user.id,
          code,
          channel: CHANNEL,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
          userAgent: userAgent || 'unknown',
        },
      }),
    ]);

    return { message: 'Kod został wysłany na Telegram' };
  }

  async verifyCode(rawPhone: string, rawCode: string, userAgent: string): Promise<BrigadeTokens> {
    const phone = normalizePhone(rawPhone);
    const user = await this.findActiveUserByPhone(phone);
    if (!user) throw new UnauthorizedException('Nieprawidłowy kod lub numer telefonu');

    const active = await this.prisma.authCode.findFirst({
      where: { userId: user.id, channel: CHANNEL, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!active) throw new UnauthorizedException('Nieprawidłowy lub wygasły kod');

    if (active.code !== rawCode.trim().toUpperCase()) {
      const attempts = active.attempts + 1;
      await this.prisma.authCode.update({
        where: { id: active.id },
        data: { attempts, isUsed: attempts >= MAX_ATTEMPTS },
      });
      if (attempts >= MAX_ATTEMPTS) {
        throw new HttpException('Zbyt wiele błędnych prób. Wyślij nowy kod.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new UnauthorizedException('Nieprawidłowy lub wygasły kod');
    }

    await this.prisma.authCode.update({ where: { id: active.id }, data: { isUsed: true } });
    return this.issueTokens(user, endOfDayInTimeZone(this.timeZone), userAgent);
  }

  /** New pair of tokens; the session still ends at the same 23:59 */
  async refresh(refreshToken: string, userAgent: string): Promise<BrigadeTokens> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!record || record.scope !== SCOPE || record.isRevoked || record.expiresAt < new Date() || !record.user.isActive) {
      throw new UnauthorizedException('Sesja wygasła. Zaloguj się ponownie.');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    return this.issueTokens(record.user, record.expiresAt, userAgent);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, scope: SCOPE, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, roles: true },
    });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phoneNumber, roles: user.roles };
  }

  private get timeZone() {
    return this.config.get<string>('AUTH_TIME_ZONE')?.trim() || 'Europe/Warsaw';
  }

  private async issueTokens(user: Foreman, expiresAt: Date, userAgent: string): Promise<BrigadeTokens> {
    const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (seconds <= 0) throw new UnauthorizedException('Sesja wygasła. Zaloguj się ponownie.');

    const accessToken = this.jwt.sign(
      { sub: user.id, phone: user.phoneNumber, firstName: user.firstName, lastName: user.lastName, roles: user.roles },
      { audience: BRIGADE_AUDIENCE, expiresIn: seconds },
    );
    const refreshToken = randomUUID();
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt, scope: SCOPE, userAgent: userAgent || 'unknown' },
    });
    return { accessToken, refreshToken, expiresAt: expiresAt.toISOString() };
  }

  /** Too many codes requested: wait before the next one */
  private async assertSendAllowed(userId: number) {
    const recent = await this.prisma.authCode.findMany({
      where: { userId, channel: CHANNEL, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const sinceLast = recent[0] ? Date.now() - recent[0].createdAt.getTime() : Infinity;
    if (sinceLast < RESEND_PAUSE_MS) {
      const wait = Math.ceil((RESEND_PAUSE_MS - sinceLast) / 1000);
      throw new HttpException(`Odczekaj ${wait} s przed wysłaniem nowego kodu`, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (recent.length >= MAX_CODES_PER_WINDOW) {
      throw new HttpException('Zbyt wiele prób. Spróbuj ponownie za 15 minut.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Phone numbers in the database may contain spaces or dashes: compare digits only */
  private async findActiveUserByPhone(phone: string): Promise<Foreman | null> {
    const digits = phone.replace(/\D/g, '');
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM users WHERE is_active = true AND regexp_replace(phone_number, '\\D', '', 'g') = ${digits} LIMIT 1`;
    if (!rows[0]) return null;
    return this.prisma.user.findUnique({
      where: { id: rows[0].id },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, roles: true },
    });
  }
}

/** "+48 123-456 789" → "+48123456789" */
export function normalizePhone(raw: string) {
  return `+${raw.replace(/\D/g, '')}`;
}
