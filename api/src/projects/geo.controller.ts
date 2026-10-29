import { Controller, Get, Query } from '@nestjs/common';
import { ContractorAccess } from '../auth/access';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  /** Coordinates + place name from a Google Maps link or "lat, lng" text */
  // Place name for coordinates is shown in the project view, also to contractors
  @ContractorAccess('scoped')
  @Get('resolve')
  resolve(@Query('input') input: string) {
    return this.geoService.resolve(input);
  }
}
