import { BadRequestException, Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';
import { ContractorAccess, CurrentUser, type AuthUser } from '../auth/access';
import { TmaClient } from './tma.client';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly tma: TmaClient) {}

  /**
   * Who is on site today (or on `date`), proxied from TMA.
   * `projectId` for one project, `mine=true` for all brigades of the logged-in manager.
   * Staff only; a contractor may see its own project (shown on the project dashboard).
   */
  @ContractorAccess('query:projectId')
  @Get('live')
  live(
    @CurrentUser() user: AuthUser,
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string,
    @Query('mine') mine?: string,
    @Query('date') date?: string,
  ) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Data musi mieć format RRRR-MM-DD');
    }
    const managerErpId = mine === 'true' && !user.isContractorOnly ? user.id : undefined;
    if (!projectId && !managerErpId) {
      throw new BadRequestException('Podaj projectId lub mine=true');
    }

    return this.tma.liveAttendance({ projectId, managerErpId, date });
  }
}
