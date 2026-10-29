import { BadRequestException, Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { CreatePlannedExpenseDto, SavePlannedExpensesDto, UpdatePlannedExpenseDto } from './dto/planned-expense.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PlannedExpensesService {
  private readonly logger = new Logger(PlannedExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheetsService: GoogleSheetsService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
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
      
      // Try to log to Postgres
      try {
        await this.prisma.google_sheets_sync_errors.create({
          data: {
            table_name: sheetName,
            action: 'CREATE_PLANNED_EXPENSE',
            error_message: errMsg,
            payload: JSON.stringify(syncData),
          }
        });
      } catch (dbErr) {
        // Silently ignore if logging fails
      }

      // Send email
      await this.mailService.sendSyncErrorEmail(
        sheetName,
        'CREATE_PLANNED_EXPENSE',
        errMsg,
        JSON.stringify(syncData, null, 2)
      );
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
      
      // Try to log to Postgres
      try {
        await this.prisma.google_sheets_sync_errors.create({
          data: {
            table_name: sheetName,
            action: 'UPDATE_PLANNED_EXPENSE',
            error_message: errMsg,
            payload: JSON.stringify(syncData),
          }
        });
      } catch (dbErr) {}

      // Send email
      await this.mailService.sendSyncErrorEmail(
        sheetName,
        'UPDATE_PLANNED_EXPENSE',
        errMsg,
        JSON.stringify(syncData, null, 2)
      );
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

  /**
   * Saves the whole plan at once: one database transaction and one batch write to the sheet,
   * instead of a request (and several sheet calls) per row.
   */
  async savePlan(projectId: string, dto: SavePlannedExpensesDto) {
    const project = await this.prisma.projects.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
    if (!project) throw new NotFoundException('Project not found');

    const items = dto.items ?? [];
    const total = items.reduce((s, i) => s + Number(i.plannedPercent || 0), 0);
    if (items.length && Math.abs(total - 100) > 0.01) {
      throw new BadRequestException(`Suma procentów musi wynosić dokładnie 100%. Obecnie jest ${total.toFixed(2)}%.`);
    }

    const existing = await this.prisma.planned_expenses.findMany({ where: { project_id: projectId }, select: { id: true } });
    const existingIds = new Set(existing.map((e) => e.id));
    const foreign = items.find((i) => i.id && !existingIds.has(i.id));
    if (foreign) throw new BadRequestException('Wydatek nie należy do tego projektu');

    const categories = await this.prisma.cost_categories.findMany();
    const sheetRows: Record<string, unknown>[] = [];

    await this.prisma.$transaction(async (tx) => {
      // Categories typed by name: reuse an existing one (case-insensitive) or create it once
      const byName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));
      const byId = new Map(categories.map((c) => [c.id.toString(), c]));
      const resolved: { id: bigint; name: string }[] = [];
      for (const item of items) {
        let category = item.costCategoryId ? byId.get(item.costCategoryId) : undefined;
        const name = item.costCategoryName?.trim();
        if (!category && name) {
          category = byName.get(name.toLowerCase());
          if (!category) {
            category = await tx.cost_categories.create({ data: { name } });
            byName.set(name.toLowerCase(), category);
            byId.set(category.id.toString(), category);
          }
        }
        if (!category) throw new BadRequestException('Brak nazwy rodzaju wydatku');
        resolved.push({ id: category.id, name: category.name });
      }

      const keep = items.flatMap((i) => (i.id ? [i.id] : []));
      await tx.planned_expenses.deleteMany({ where: { project_id: projectId, id: { notIn: keep } } });

      for (const [index, item] of items.entries()) {
        const id = item.id ?? randomUUID();
        const data = { cost_category_id: resolved[index].id, planned_percent: item.plannedPercent };
        if (item.id) await tx.planned_expenses.update({ where: { id }, data });
        else await tx.planned_expenses.create({ data: { id, project_id: projectId, ...data } });
        sheetRows.push({
          id,
          projectId,
          projectName: project.name,
          costCategory: resolved[index].name,
          plannedPercent: item.plannedPercent,
        });
      }
    });

    // One batch to Google Sheets; a failure is logged and reported, the plan itself is saved
    const spreadsheetId = this.config.getOrThrow<string>('PROJECTS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('PLANNED_EXPENSES_SHEET_NAME', 'Wydatki');
    try {
      await this.sheetsService.upsertRows(spreadsheetId, sheetName, sheetRows);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Planned expenses sheet sync failed: ${errMsg}`);
      await this.prisma.google_sheets_sync_errors
        .create({ data: { table_name: sheetName, action: 'SAVE_PLANNED_EXPENSES', error_message: errMsg, payload: JSON.stringify(sheetRows) } })
        .catch(() => undefined);
      await this.mailService
        .sendSyncErrorEmail(sheetName, 'SAVE_PLANNED_EXPENSES', errMsg, JSON.stringify(sheetRows, null, 2))
        .catch(() => undefined);
    }

    return this.findAll(projectId);
  }

  async remove(projectId: string, id: string) {
    await this.prisma.planned_expenses.delete({
      where: { id },
    });
    return { success: true };
  }
}
