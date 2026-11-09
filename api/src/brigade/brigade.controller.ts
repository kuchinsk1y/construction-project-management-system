import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { BrigadeAccess, CurrentUser, Public, type AuthUser } from '../auth/access';
import { BrigadeRefreshDto, BrigadeSendCodeDto, BrigadeVerifyCodeDto } from './brigade-auth.dto';
import { BrigadeAuthService } from './brigade-auth.service';
import { PulpitService } from './pulpit.service';
import { DayFormService } from './day-form.service';
import { HoursReportService } from './hours-report.service';
import { WORK_LOG_MAX_DAYS, WorkLogService } from './work-log.service';

/** Sign-in of the brigade app (phone + code in Telegram). Separate from the ERP e-mail sign-in at /auth. */
@Public()
@Controller('brigade/auth')
export class BrigadeAuthController {
  constructor(private readonly auth: BrigadeAuthService) {}

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  sendCode(@Body() dto: BrigadeSendCodeDto, @Headers('user-agent') userAgent: string) {
    return this.auth.sendCode(dto.phone, userAgent);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  verifyCode(@Body() dto: BrigadeVerifyCodeDto, @Headers('user-agent') userAgent: string) {
    return this.auth.verifyCode(dto.phone, dto.code, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: BrigadeRefreshDto, @Headers('user-agent') userAgent: string) {
    return this.auth.refresh(dto.refreshToken, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: BrigadeRefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
}

/** Endpoints of the brigade app: brigade token only */
@BrigadeAccess()
@Controller('brigade')
export class BrigadeController {
  constructor(
    private readonly auth: BrigadeAuthService,
    private readonly pulpit: PulpitService,
    private readonly workLog: WorkLogService,
    private readonly hoursReport: HoursReportService,
    private readonly dayForm: DayFormService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  /** Foreman's dashboard: crew and 14-day activity (Google Sheets of ST_BR) + projects (ERP). `?fresh=1` skips the 1-minute cache */
  @Get('pulpit')
  getPulpit(@CurrentUser() user: AuthUser, @Query('fresh') fresh?: string) {
    return this.pulpit.get(user.id, fresh === '1' || fresh === 'true');
  }

  /** History of the foreman's entries for the last `days` days (1–14, default 14), grouped by day and worker */
  @Get('work-log')
  getWorkLog(@CurrentUser() user: AuthUser, @Query('days') days?: string, @Query('fresh') fresh?: string) {
    const count = days === undefined || days === '' ? WORK_LOG_MAX_DAYS : Number(days);
    if (!Number.isInteger(count) || count < 1 || count > WORK_LOG_MAX_DAYS) {
      throw new BadRequestException(`days: liczba od 1 do ${WORK_LOG_MAX_DAYS}`);
    }
    return this.workLog.get(user.id, count, fresh === '1' || fresh === 'true');
  }

  /** Hours of the foreman's people: worker × day of `month` (RRRR-MM, default current), optional `company` */
  @Get('hours-report')
  getHoursReport(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
    @Query('company') company?: string,
    @Query('fresh') fresh?: string,
  ) {
    return this.hoursReport.get(user.id, month, company, fresh === '1' || fresh === 'true');
  }

  /** Data for the "Dodaj wpis" form of `date` (RRRR-MM-DD): crew, vacations, projects with work types, surcharges. Read only. */
  @Get('day-form')
  getDayForm(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.dayForm.get(user.id, date?.trim() ?? '');
  }
}
