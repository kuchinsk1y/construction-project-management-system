import { Controller, Get } from '@nestjs/common';
import { ContractorAccess, CurrentUser, type AuthUser } from '../auth/access';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** The service limits a contractor to its own company's projects */
  @ContractorAccess('scoped')
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getSummary(user.id);
  }
}
