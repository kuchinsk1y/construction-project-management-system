import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectsSyncConsumer } from './projects-sync.consumer';
import { PlannedExpensesModule } from '../planned-expenses/planned-expenses.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'projects-sync',
    }),
    PlannedExpensesModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsSyncConsumer],
})
export class ProjectsModule {}
