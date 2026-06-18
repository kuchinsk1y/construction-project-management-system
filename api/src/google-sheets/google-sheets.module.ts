import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { GoogleSheetsController } from './google-sheets.controller';
import { GoogleSheetsService } from './google-sheets.service';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
