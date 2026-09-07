"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannedExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const google_sheets_service_1 = require("../google-sheets/google-sheets.service");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
let PlannedExpensesService = class PlannedExpensesService {
    prisma;
    sheetsService;
    config;
    constructor(prisma, sheetsService, config) {
        this.prisma = prisma;
        this.sheetsService = sheetsService;
        this.config = config;
    }
    async findAll(projectId) {
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
    async create(projectId, dto) {
        const project = await this.prisma.projects.findUnique({ where: { id: projectId } });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const costCategory = await this.prisma.cost_categories.findUnique({
            where: { id: BigInt(dto.costCategoryId) },
        });
        if (!costCategory)
            throw new common_1.NotFoundException('Cost category not found');
        const expenseId = (0, crypto_1.randomUUID)();
        const spreadsheetId = this.config.getOrThrow('PROJECTS_SPREADSHEET_ID');
        const sheetName = this.config.get('PLANNED_EXPENSES_SHEET_NAME', 'Wydatki');
        const syncData = {
            id: expenseId,
            projectId: projectId,
            projectName: project.name,
            costCategory: costCategory.name,
            plannedPercent: dto.plannedPercent,
        };
        try {
            await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const errorsSheet = this.config.get('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
            try {
                await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
                    timestamp: new Date().toISOString(),
                    action: 'CREATE_PLANNED_EXPENSE',
                    error_message: errMsg,
                    payload: JSON.stringify(syncData),
                });
            }
            catch (logErr) { }
            throw new common_1.InternalServerErrorException('Nie udało się zapisać wydatku w Google Sheets');
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
    async update(projectId, id, dto) {
        const existing = await this.prisma.planned_expenses.findUnique({
            where: { id },
            include: { projects: true, cost_categories: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Planned expense not found');
        let costCategoryName = existing.cost_categories?.name ?? '';
        if (dto.costCategoryId) {
            const cat = await this.prisma.cost_categories.findUnique({ where: { id: BigInt(dto.costCategoryId) } });
            if (cat)
                costCategoryName = cat.name;
        }
        const spreadsheetId = this.config.getOrThrow('PROJECTS_SPREADSHEET_ID');
        const sheetName = this.config.get('PLANNED_EXPENSES_SHEET_NAME', 'Wydatki');
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
            }
            else {
                await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
            }
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const errorsSheet = this.config.get('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
            try {
                await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
                    timestamp: new Date().toISOString(),
                    action: 'UPDATE_PLANNED_EXPENSE',
                    error_message: errMsg,
                    payload: JSON.stringify(syncData),
                });
            }
            catch (logErr) { }
            throw new common_1.InternalServerErrorException('Nie udało się zaktualizować wydatku w Google Sheets');
        }
        const data = {};
        if (dto.costCategoryId)
            data.cost_category_id = BigInt(dto.costCategoryId);
        if (dto.plannedPercent !== undefined)
            data.planned_percent = dto.plannedPercent;
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
    async remove(projectId, id) {
        await this.prisma.planned_expenses.delete({
            where: { id },
        });
        return { success: true };
    }
};
exports.PlannedExpensesService = PlannedExpensesService;
exports.PlannedExpensesService = PlannedExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        google_sheets_service_1.GoogleSheetsService,
        config_1.ConfigService])
], PlannedExpensesService);
//# sourceMappingURL=planned-expenses.service.js.map