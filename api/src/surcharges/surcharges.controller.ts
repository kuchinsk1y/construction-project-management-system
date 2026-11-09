import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Public, Role, Roles } from '../auth/access';
import { IntegrationClients, IntegrationKeyGuard } from '../integration/guards/integration-key.guard';
import { CreateSurchargeDto, UpdateSurchargeDto } from './surcharge.dto';
import { SurchargesService } from './surcharges.service';

/** Settings → Dopłaty: managed by an admin only */
@Roles(Role.Admin)
@Controller('surcharges')
export class SurchargesController {
  constructor(private readonly surcharges: SurchargesService) {}

  @Get()
  list() {
    return this.surcharges.list();
  }

  @Post()
  create(@Body() dto: CreateSurchargeDto) {
    return this.surcharges.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSurchargeDto) {
    return this.surcharges.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.surcharges.remove(id);
  }
}

/**
 * Read-only for the brigade app ST_BR (own key ST_BR_API_KEY; TMA's key also accepted for now).
 * ERP owns the rates and decides which apply on which day:
 * - `?date=YYYY-MM-DD` — one day (default: today in Poland)
 * - `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` — a period of up to 62 days
 */
@Public()
@IntegrationClients('stbr', 'tma')
@UseGuards(IntegrationKeyGuard)
@Controller('v1/integration/surcharges')
export class SurchargesIntegrationController {
  constructor(private readonly surcharges: SurchargesService) {}

  @Get()
  forPeriod(@Query('date') date?: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.surcharges.forPeriod({ date, dateFrom, dateTo });
  }
}
