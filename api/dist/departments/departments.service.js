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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const google_sheets_service_1 = require("../google-sheets/google-sheets.service");
const client_1 = require("@prisma/client");
let DepartmentsService = class DepartmentsService {
    prisma;
    config;
    sheetsService;
    constructor(prisma, config, sheetsService) {
        this.prisma = prisma;
        this.config = config;
        this.sheetsService = sheetsService;
    }
    async findAll() {
        const list = await this.prisma.departments.findMany({
            orderBy: { id: 'asc' },
        });
        return list.map((d) => ({
            ...d,
            id: Number(d.id),
        }));
    }
    async create(data) {
        const created = await this.prisma.departments.create({
            data: {
                name: data.name,
                description: data.description,
                icon: data.icon ?? 'Folder',
                is_active: data.is_active ?? true,
            },
        });
        const spreadsheetId = this.config.getOrThrow('PROJECTS_SPREADSHEET_ID');
        const sheetName = this.config.get('DEPARTMENTS_SHEET_NAME', 'Dzialy');
        const syncData = {
            id: Number(created.id),
            name: created.name,
            description: created.description ?? '',
            icon: created.icon,
            is_active: created.is_active ? 'TRUE' : 'FALSE',
        };
        try {
            await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
        }
        catch (error) {
            await this.prisma.departments.delete({ where: { id: created.id } });
            const errMsg = error instanceof Error ? error.message : String(error);
            const errorsSheet = this.config.get('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
            try {
                await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
                    timestamp: new Date().toISOString(),
                    action: 'CREATE_DEPARTMENT',
                    error_message: errMsg,
                    payload: JSON.stringify(syncData),
                });
            }
            catch (logErr) { }
            throw new common_1.InternalServerErrorException('Nie udało się zapisać działu w Google Sheets');
        }
        return { ...created, id: Number(created.id) };
    }
    async update(id, data) {
        const existing = await this.prisma.departments.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Department not found');
        }
        const spreadsheetId = this.config.getOrThrow('PROJECTS_SPREADSHEET_ID');
        const sheetName = this.config.get('DEPARTMENTS_SHEET_NAME', 'Dzialy');
        const syncData = {
            id: Number(id),
            name: data.name ?? existing.name,
            description: data.description !== undefined ? (data.description ?? '') : (existing.description ?? ''),
            icon: data.icon ?? existing.icon,
            is_active: data.is_active !== undefined ? (data.is_active ? 'TRUE' : 'FALSE') : (existing.is_active ? 'TRUE' : 'FALSE'),
        };
        try {
            const rowIndex = await this.sheetsService.findRowIndexById(spreadsheetId, sheetName, id.toString());
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
                    action: 'UPDATE_DEPARTMENT',
                    error_message: errMsg,
                    payload: JSON.stringify(syncData),
                });
            }
            catch (logErr) { }
            throw new common_1.InternalServerErrorException('Nie udało się zaktualizować działu w Google Sheets');
        }
        const updated = await this.prisma.departments.update({
            where: { id },
            data,
        });
        return { ...updated, id: Number(updated.id) };
    }
    async remove(id) {
        try {
            const workTypesCount = await this.prisma.project_work_types.count({
                where: { department_id: id },
            });
            const foremenCount = await this.prisma.project_department_foremen.count({
                where: { department_id: id },
            });
            if (workTypesCount > 0 || foremenCount > 0) {
                throw new common_1.BadRequestException('Nie można usunąć działu, ponieważ jest on przypisany do projektów.');
            }
            await this.prisma.departments.delete({
                where: { id },
            });
            return { success: true };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2003') {
                    throw new common_1.BadRequestException('Nie można usunąć działu, ponieważ wystąpił problem ze spójnością danych.');
                }
            }
            throw error;
        }
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        google_sheets_service_1.GoogleSheetsService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map