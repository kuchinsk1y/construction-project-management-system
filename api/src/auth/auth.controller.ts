import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessageResponseDto, TokensResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  sendCode(
    @Body() dto: SendCodeDto,
    @Headers('user-agent') userAgent: string,
  ): Promise<MessageResponseDto> {
    return this.authService.sendCode(dto, userAgent);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  verifyCode(
    @Body() dto: VerifyCodeDto,
    @Headers('user-agent') userAgent: string,
  ): Promise<TokensResponseDto> {
    return this.authService.verifyCode(dto, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent: string,
  ): Promise<TokensResponseDto> {
    return this.authService.refresh(dto, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto);
  }
}
