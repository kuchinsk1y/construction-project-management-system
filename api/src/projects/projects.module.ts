import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectsSyncConsumer } from './projects-sync.consumer';
import { PlannedExpensesModule } from '../planned-expenses/planned-expenses.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'projects-sync',
    }),
    PlannedExpensesModule,
    MailModule,
    AuthModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsSyncConsumer],
})
export class ProjectsModule {}
