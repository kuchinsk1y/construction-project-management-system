import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrigadeAuthController, BrigadeController } from './brigade.controller';
import { BrigadeAuthService } from './brigade-auth.service';
import { HoursReportService } from './hours-report.service';
import { CrewService } from './crew.service';
import { DayFormService } from './day-form.service';
import { PulpitService } from './pulpit.service';
import { StBrSheetsClient } from './sheets/st-br-sheets.client';
import { TelegramCodeSender } from './telegram-code.sender';
import { TmaForemanClient } from './tma-foreman.client';
import { WorkLogService } from './work-log.service';

/** Brigade app (foremen's work log): sign-in by phone + Telegram code, dashboard and its endpoints */
@Module({
  imports: [AuthModule],
  controllers: [BrigadeAuthController, BrigadeController],
  providers: [BrigadeAuthService, TmaForemanClient, TelegramCodeSender, PulpitService, StBrSheetsClient, WorkLogService, HoursReportService, CrewService, DayFormService],
})
export class BrigadeModule {}
