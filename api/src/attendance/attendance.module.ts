import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttendanceController } from './attendance.controller';
import { TmaClient } from './tma.client';

@Module({
  imports: [AuthModule],
  controllers: [AttendanceController],
  providers: [TmaClient],
})
export class AttendanceModule {}
