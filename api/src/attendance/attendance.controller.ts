import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  ParseUUIDPipe,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TmaClient } from './tma.client';

const STAFF_ROLES = [
  'admin',
  'administrator',
  'operational_director',
  'financial_director',
  'project_manager',
  'foreman',
  'viewer',
];

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly tma: TmaClient,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Who is on site today (or on `date`), proxied from TMA.
   * `projectId` for one project, `mine=true` for all brigades of the logged-in manager.
   */
  @Get('live')
  async live(
    @Headers('authorization') authorization: string | undefined,
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string,
    @Query('mine') mine?: string,
    @Query('date') date?: string,
  ) {
    const userId = await this.requireStaff(authorization);

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Data musi mieć format RRRR-MM-DD');
    }
    const managerErpId = mine === 'true' ? userId : undefined;
    if (!projectId && !managerErpId) {
      throw new BadRequestException('Podaj projectId lub mine=true');
    }

    return this.tma.liveAttendance({ projectId, managerErpId, date });
  }

  /** Attendance is internal staff data: contractors and anonymous callers are not allowed. */
  private async requireStaff(authorization?: string): Promise<number> {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException();

    let userId: number | undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: number }>(token);
      userId = typeof payload.sub === 'number' ? payload.sub : undefined;
    } catch {
      throw new UnauthorizedException();
    }
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    const roles = (user?.roles ?? []).map((r) => r.toLowerCase());
    if (!roles.some((r) => STAFF_ROLES.includes(r))) {
      throw new ForbiddenException('Brak dostępu do obecności na budowie');
    }
    return userId;
  }
}
