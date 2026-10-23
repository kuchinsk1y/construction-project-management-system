import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { ProtocolStorageService } from './protocol-storage.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, ProtocolStorageService],
})
export class InvoicesModule {}
