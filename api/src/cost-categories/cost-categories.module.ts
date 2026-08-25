import { Module } from '@nestjs/common';
import { CostCategoriesController } from './cost-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CostCategoriesController],
})
export class CostCategoriesModule {}
