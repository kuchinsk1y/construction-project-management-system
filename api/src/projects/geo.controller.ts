import { Controller, Get, Query } from '@nestjs/common';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  /** Coordinates + place name from a Google Maps link or "lat, lng" text */
  @Get('resolve')
  resolve(@Query('input') input: string) {
    return this.geoService.resolve(input);
  }
}
