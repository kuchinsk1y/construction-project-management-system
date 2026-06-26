import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContractorsModule } from './contractors/contractors.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ContractorsModule,
    GoogleSheetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
