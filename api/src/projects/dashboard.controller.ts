import { Controller, Get, Headers } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly jwt: JwtService,
  ) {}

  @Get('summary')
  async summary(@Headers('authorization') authorization?: string) {
    return this.dashboardService.getSummary(
      await this.requesterId(authorization),
    );
  }

  /** Id of the logged-in user from the Bearer token, or null if missing/invalid. */
  private async requesterId(authorization?: string): Promise<number | null> {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: number }>(token);
      return typeof payload.sub === 'number' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
