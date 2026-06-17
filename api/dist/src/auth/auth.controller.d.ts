import { AuthService } from './auth.service';
import { MessageResponseDto, TokensResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sendCode(dto: SendCodeDto, userAgent: string): Promise<MessageResponseDto>;
    verifyCode(dto: VerifyCodeDto, userAgent: string): Promise<TokensResponseDto>;
    refresh(dto: RefreshTokenDto, userAgent: string): Promise<TokensResponseDto>;
    logout(dto: RefreshTokenDto): Promise<void>;
}
