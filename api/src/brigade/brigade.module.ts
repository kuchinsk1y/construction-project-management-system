import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrigadeAuthController, BrigadeController } from './brigade.controller';
import { BrigadeAuthService } from './brigade-auth.service';
import { CrewService } from './crew.service';
import { DayFormService } from './day-form.service';
import { HoursReportService } from './hours-report.service';
import { PulpitService } from './pulpit.service';
import { TelegramCodeSender } from './telegram-code.sender';
import { TmaBrigadeClient } from './tma/tma-brigade.client';
import { WorkLogService } from './work-log.service';

/**
 * Brigade app (foremen's work log). Foremen, crews and absences come from TMA (mock for now);
 * Sign-in by phone + Telegram code; projects, work types and surcharges from ERP.
 */
@Module({
  imports: [AuthModule],
  controllers: [BrigadeAuthController, BrigadeController],
  providers: [
    BrigadeAuthService,
    TmaBrigadeClient,
    TelegramCodeSender,
    CrewService,
    PulpitService,
    WorkLogService,
    HoursReportService,
    DayFormService,
  ],
})
export class BrigadeModule {}
