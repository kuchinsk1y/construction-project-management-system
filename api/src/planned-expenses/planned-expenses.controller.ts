import { Roles, Role } from '../auth/access';
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PlannedExpensesService } from './planned-expenses.service';
import { CreatePlannedExpenseDto, SavePlannedExpensesDto, UpdatePlannedExpenseDto } from './dto/planned-expense.dto';

@Controller('projects/:projectId/planned-expenses')
export class PlannedExpensesController {
  constructor(private readonly plannedExpensesService: PlannedExpensesService) {}

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    return this.plannedExpensesService.findAll(projectId);
  }

  @Post()
  @Roles(Role.OperationalDirector)
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePlannedExpenseDto,
  ) {
    return this.plannedExpensesService.create(projectId, dto);
  }

  /** Saves the whole plan in one request (rows not sent are removed) */
  @Put()
  @Roles(Role.OperationalDirector)
  async savePlan(@Param('projectId') projectId: string, @Body() dto: SavePlannedExpensesDto) {
    return this.plannedExpensesService.savePlan(projectId, dto);
  }

  @Put(':id')
  @Roles(Role.OperationalDirector)
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlannedExpenseDto,
  ) {
    return this.plannedExpensesService.update(projectId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OperationalDirector)
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.plannedExpensesService.remove(projectId, id);
  }
}
