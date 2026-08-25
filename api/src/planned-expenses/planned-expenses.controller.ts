import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreatePlannedExpenseDto {
  @IsString()
  @IsNotEmpty()
  costCategoryId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  plannedPercent: number;
}

export class UpdatePlannedExpenseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  costCategoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  plannedPercent?: number;
}

@Controller('projects/:projectId/planned-expenses')
export class PlannedExpensesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    const expenses = await this.prisma.planned_expenses.findMany({
      where: { project_id: projectId },
      include: {
        cost_categories: true,
      },
      orderBy: { id: 'asc' },
    });

    return expenses.map((e) => ({
      id: e.id,
      projectId: e.project_id,
      costCategoryId: e.cost_category_id.toString(),
      costCategoryName: e.cost_categories?.name,
      plannedPercent: e.planned_percent ? Number(e.planned_percent) : 0,
    }));
  }

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePlannedExpenseDto,
  ) {
    // Check if project exists
    const project = await this.prisma.projects.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const expense = await this.prisma.planned_expenses.create({
      data: {
        project_id: projectId,
        cost_category_id: BigInt(dto.costCategoryId),
        planned_percent: dto.plannedPercent,
      },
      include: {
        cost_categories: true,
      }
    });

    return {
      id: expense.id,
      projectId: expense.project_id,
      costCategoryId: expense.cost_category_id.toString(),
      costCategoryName: expense.cost_categories?.name,
      plannedPercent: expense.planned_percent ? Number(expense.planned_percent) : 0,
    };
  }

  @Put(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlannedExpenseDto,
  ) {
    const data: any = {};
    if (dto.costCategoryId) data.cost_category_id = BigInt(dto.costCategoryId);
    if (dto.plannedPercent !== undefined) data.planned_percent = dto.plannedPercent;

    const expense = await this.prisma.planned_expenses.update({
      where: { id },
      data,
      include: {
        cost_categories: true,
      }
    });

    return {
      id: expense.id,
      projectId: expense.project_id,
      costCategoryId: expense.cost_category_id.toString(),
      costCategoryName: expense.cost_categories?.name,
      plannedPercent: expense.planned_percent ? Number(expense.planned_percent) : 0,
    };
  }

  @Delete(':id')
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.prisma.planned_expenses.delete({
      where: { id },
    });
    return { success: true };
  }
}
