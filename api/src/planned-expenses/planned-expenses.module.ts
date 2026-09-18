import { Module } from '@nestjs/common';
import { PlannedExpensesController } from './planned-expenses.controller';
import { PlannedExpensesService } from './planned-expenses.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [PlannedExpensesController],
  providers: [PlannedExpensesService],
  exports: [PlannedExpensesService],
})
export class PlannedExpensesModule {}
