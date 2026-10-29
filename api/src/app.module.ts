import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './auth/access.guard';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContractorsModule } from './contractors/contractors.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { CostCategoriesModule } from './cost-categories/cost-categories.module';
import { PlannedExpensesModule } from './planned-expenses/planned-expenses.module';
import { IntegrationModule } from './integration/integration.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AttendanceModule } from './attendance/attendance.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ContractorsModule,
    GoogleSheetsModule,
    DepartmentsModule,
    CostCategoriesModule,
    PlannedExpensesModule,
    IntegrationModule,
    FeedbackModule,
    AttendanceModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  // Every endpoint requires login and the right role unless marked @Public()
  providers: [AppService, { provide: APP_GUARD, useClass: AccessGuard }],
})
export class AppModule { }
