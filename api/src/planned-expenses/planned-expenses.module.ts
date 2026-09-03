import { Module } from '@nestjs/common';
import { PlannedExpensesController } from './planned-expenses.controller';
import { PlannedExpensesService } from './planned-expenses.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlannedExpensesController],
  providers: [PlannedExpensesService],
  exports: [PlannedExpensesService],
})
export class PlannedExpensesModule {}
