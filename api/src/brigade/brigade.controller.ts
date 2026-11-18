import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { BrigadeAccess, CurrentForeman, Public, type BrigadeForeman } from '../auth/access';
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

/** Endpoints of the brigade app: brigade token only. The foreman comes from TMA, not from ERP users. */
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
  me(@CurrentForeman() foreman: BrigadeForeman) {
    return this.auth.me(foreman);
  }

  /** Foreman's dashboard: crew and projects (TMA). `?fresh=1` asks TMA again instead of the 1-minute cache */
  @Get('pulpit')
  getPulpit(@CurrentForeman() foreman: BrigadeForeman, @Query('fresh') fresh?: string) {
    return this.pulpit.get(foreman, fresh === '1' || fresh === 'true');
  }

  /** History of the foreman's entries for the last `days` days (1–14, default 14); empty until entries are stored */
  @Get('work-log')
  getWorkLog(@CurrentForeman() foreman: BrigadeForeman, @Query('days') days?: string) {
    const count = days === undefined || days === '' ? WORK_LOG_MAX_DAYS : Number(days);
    if (!Number.isInteger(count) || count < 1 || count > WORK_LOG_MAX_DAYS) {
      throw new BadRequestException(`days: liczba od 1 do ${WORK_LOG_MAX_DAYS}`);
    }
    return this.workLog.get(foreman, count);
  }

  /** Worker × day of `month` (RRRR-MM, default current), optional `company`; for now only absences from TMA */
  @Get('hours-report')
  getHoursReport(
    @CurrentForeman() foreman: BrigadeForeman,
    @Query('month') month?: string,
    @Query('company') company?: string,
    @Query('fresh') fresh?: string,
  ) {
    return this.hoursReport.get(foreman, month, company, fresh === '1' || fresh === 'true');
  }

  /** Date picker of the form: days of `month` (RRRR-MM, default current) that TMA opens for filling in */
  @Get('day-form/calendar')
  getDayFormCalendar(@CurrentForeman() foreman: BrigadeForeman, @Query('month') month?: string) {
    return this.dayForm.calendar(foreman, month);
  }

  /** Data for the "Dodaj wpis" form of `date` (RRRR-MM-DD): crew and absences (TMA), projects with work types, surcharges. Read only. */
  @Get('day-form')
  getDayForm(@CurrentForeman() foreman: BrigadeForeman, @Query('date') date?: string) {
    return this.dayForm.get(foreman, date?.trim() ?? '');
  }
}
