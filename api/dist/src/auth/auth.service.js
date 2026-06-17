"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let AuthService = class AuthService {
    prisma;
    jwt;
    mail;
    constructor(prisma, jwt, mail) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.mail = mail;
    }
    async sendCode(dto, userAgent) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: { email, isActive: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User with this email does not exist or is inactive');
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
    async verifyCode(dto, userAgent) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: { email, isActive: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid code or email');
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
            throw new common_1.UnauthorizedException('Invalid or expired code');
        }
        await this.prisma.authCode.update({
            where: { id: authCode.id },
            data: { isUsed: true },
        });
        return this.issueTokens(user.id, user.email, user.roles, user.firstName, user.lastName, userAgent);
    }
    async refresh(dto, userAgent) {
        const record = await this.prisma.refreshToken.findUnique({
            where: { token: dto.refreshToken },
            include: { user: true },
        });
        if (!record ||
            record.isRevoked ||
            record.expiresAt < new Date() ||
            !record.user.isActive) {
            throw new common_1.UnauthorizedException('Refresh token is invalid or revoked');
        }
        await this.prisma.refreshToken.update({
            where: { id: record.id },
            data: { isRevoked: true, revokedAt: new Date() },
        });
        return this.issueTokens(record.user.id, record.user.email, record.user.roles, record.user.firstName, record.user.lastName, userAgent);
    }
    async logout(dto) {
        await this.prisma.refreshToken.updateMany({
            where: { token: dto.refreshToken, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
        });
    }
    async issueTokens(userId, email, roles, firstName, lastName, userAgent) {
        const accessToken = this.jwt.sign({
            sub: userId,
            email,
            roles,
            firstName,
            lastName,
        });
        const refreshToken = (0, crypto_1.randomUUID)();
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
    generateCode() {
        return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map