import { Module } from '@nestjs/common';
import { PlannedExpensesController } from './planned-expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlannedExpensesController],
})
export class PlannedExpensesModule {}
