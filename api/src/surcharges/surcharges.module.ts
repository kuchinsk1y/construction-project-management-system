import { Module } from '@nestjs/common';
import { SurchargesController, SurchargesIntegrationController } from './surcharges.controller';
import { SurchargesService } from './surcharges.service';

@Module({
  controllers: [SurchargesController, SurchargesIntegrationController],
  providers: [SurchargesService],
})
export class SurchargesModule {}
