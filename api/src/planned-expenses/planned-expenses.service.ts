import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConfigService } from '@nestjs/config';
import { CreatePlannedExpenseDto, UpdatePlannedExpenseDto } from './dto/planned-expense.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PlannedExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sheetsService: GoogleSheetsService,
    private readonly config: ConfigService,
  ) {}

  async findAll(projectId: string) {
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

  async create(projectId: string, dto: CreatePlannedExpenseDto) {
    const project = await this.prisma.projects.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const costCategory = await this.prisma.cost_categories.findUnique({
      where: { id: BigInt(dto.costCategoryId) },
    });
    if (!costCategory) throw new NotFoundException('Cost category not found');

    const expenseId = randomUUID();
    
    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('PLANNED_EXPENSES_SHEET_NAME', 'Wydatki');

    const syncData = {
      id: expenseId,
      projectId: projectId,
      projectName: project.name,
      costCategory: costCategory.name,
      plannedPercent: dto.plannedPercent,
    };

    try {
      await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errorsSheet = this.config.get<string>('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
      try {
        await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
          timestamp: new Date().toISOString(),
          action: 'CREATE_PLANNED_EXPENSE',
          error_message: errMsg,
          payload: JSON.stringify(syncData),
        });
      } catch (logErr) {}
      throw new InternalServerErrorException('Nie udało się zapisać wydatku w Google Sheets');
    }

    const expense = await this.prisma.planned_expenses.create({
      data: {
        id: expenseId,
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

  async update(projectId: string, id: string, dto: UpdatePlannedExpenseDto) {
    const existing = await this.prisma.planned_expenses.findUnique({
      where: { id },
      include: { projects: true, cost_categories: true },
    });
    if (!existing) throw new NotFoundException('Planned expense not found');

    let costCategoryName = existing.cost_categories?.name ?? '';
    if (dto.costCategoryId) {
      const cat = await this.prisma.cost_categories.findUnique({ where: { id: BigInt(dto.costCategoryId) } });
      if (cat) costCategoryName = cat.name;
    }

    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('PLANNED_EXPENSES_SHEET_NAME', 'Wydatki');

    const syncData = {
      id: id,
      projectId: projectId,
      projectName: existing.projects?.name ?? '',
      costCategory: costCategoryName,
      plannedPercent: dto.plannedPercent !== undefined ? dto.plannedPercent : (existing.planned_percent ? Number(existing.planned_percent) : 0),
    };

    try {
      const rowIndex = await this.sheetsService.findRowIndexById(spreadsheetId, sheetName, id);
      if (rowIndex) {
        await this.sheetsService.updateRow(spreadsheetId, sheetName, rowIndex, syncData);
      } else {
        await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errorsSheet = this.config.get<string>('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
      try {
        await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
          timestamp: new Date().toISOString(),
          action: 'UPDATE_PLANNED_EXPENSE',
          error_message: errMsg,
          payload: JSON.stringify(syncData),
        });
      } catch (logErr) {}
      throw new InternalServerErrorException('Nie udało się zaktualizować wydatku w Google Sheets');
    }

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

  async remove(projectId: string, id: string) {
    await this.prisma.planned_expenses.delete({
      where: { id },
    });
    return { success: true };
  }
}
