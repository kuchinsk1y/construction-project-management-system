import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { MessageResponseDto, TokensResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async sendCode(
    dto: SendCodeDto,
    userAgent: string,
  ): Promise<MessageResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new NotFoundException(
        'User with this email does not exist or is inactive',
      );
    }

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.authCode.updateMany({
        where: { userId: user.id, isUsed: false },
        data: { isUsed: true },
      }),
      this.prisma.authCode.create({
        data: {
          userId: user.id,
          code,
          expiresAt,
          userAgent: userAgent || 'unknown',
        },
      }),
    ]);

    await this.mail.sendAuthCode(user.email, code, user.firstName);

    return { message: 'Verification code was sent to email' };
  }

  async verifyCode(
    dto: VerifyCodeDto,
    userAgent: string,
  ): Promise<TokensResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid code or email');
    }

    const authCode = await this.prisma.authCode.findFirst({
      where: {
        userId: user.id,
        code: dto.code.toUpperCase(),
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!authCode) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.prisma.authCode.update({
      where: { id: authCode.id },
      data: { isUsed: true },
    });

    return this.issueTokens(
      user.id,
      user.email,
      user.roles,
      user.firstName,
      user.lastName,
      userAgent,
    );
  }

  async refresh(
    dto: RefreshTokenDto,
    userAgent: string,
  ): Promise<TokensResponseDto> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (
      !record ||
      record.isRevoked ||
      record.expiresAt < new Date() ||
      !record.user.isActive
    ) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    return this.issueTokens(
      record.user.id,
      record.user.email,
      record.user.roles,
      record.user.firstName,
      record.user.lastName,
      userAgent,
    );
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: dto.refreshToken, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: number,
    email: string,
    roles: string[],
    firstName: string | null,
    lastName: string | null,
    userAgent: string,
  ): Promise<TokensResponseDto> {
    const accessToken = this.jwt.sign({
      sub: userId,
      email,
      roles,
      firstName,
      lastName,
    });

    const refreshToken = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        userAgent: userAgent || 'unknown',
      },
    });

    return { accessToken, refreshToken };
  }

  private generateCode(): string {
    return Array.from(
      { length: 6 },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
  }
}
