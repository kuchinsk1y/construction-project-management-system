import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { MessageResponseDto, TokensResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly mail;
    constructor(prisma: PrismaService, jwt: JwtService, mail: MailService);
    sendCode(dto: SendCodeDto, userAgent: string): Promise<MessageResponseDto>;
    verifyCode(dto: VerifyCodeDto, userAgent: string): Promise<TokensResponseDto>;
    refresh(dto: RefreshTokenDto, userAgent: string): Promise<TokensResponseDto>;
    logout(dto: RefreshTokenDto): Promise<void>;
    private issueTokens;
    private generateCode;
}
