import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PlannedExpensesService } from './planned-expenses.service';
import { CreatePlannedExpenseDto, UpdatePlannedExpenseDto } from './dto/planned-expense.dto';

@Controller('projects/:projectId/planned-expenses')
export class PlannedExpensesController {
  constructor(private readonly plannedExpensesService: PlannedExpensesService) {}

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    return this.plannedExpensesService.findAll(projectId);
  }

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePlannedExpenseDto,
  ) {
    return this.plannedExpensesService.create(projectId, dto);
  }

  @Put(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlannedExpenseDto,
  ) {
    return this.plannedExpensesService.update(projectId, id, dto);
  }

  @Delete(':id')
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.plannedExpensesService.remove(projectId, id);
  }
}
