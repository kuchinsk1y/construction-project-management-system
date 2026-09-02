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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const google_sheets_service_1 = require("../google-sheets/google-sheets.service");
let UsersService = class UsersService {
    prisma;
    config;
    sheetsService;
    constructor(prisma, config, sheetsService) {
        this.prisma = prisma;
        this.config = config;
        this.sheetsService = sheetsService;
    }
    selectFields = {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleNames: true,
        position: true,
        phoneNumber: true,
        telegramId: true,
        isActive: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
    };
    toView(record) {
        return {
            ...record,
            telegramId: record.telegramId ? record.telegramId.toString() : null,
        };
    }
    normalizeRoles(input) {
        const roles = (input ?? ['contractor'])
            .map((role) => role.trim())
            .filter((role) => role.length > 0);
        if (roles.length === 0) {
            throw new common_1.BadRequestException('Roles must contain at least one value');
        }
        return roles;
    }
    async list() {
        const rows = await this.prisma.user.findMany({
            orderBy: [{ createdAt: 'desc' }],
            select: this.selectFields,
        });
        return rows.map((row) => this.toView(row));
    }
    async create(dto) {
        const email = dto.email.trim().toLowerCase();
        const phoneNumber = dto.phoneNumber.trim();
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists) {
            throw new common_1.BadRequestException('User with this email already exists');
        }
        const phoneExists = await this.prisma.user.findUnique({
            where: { phoneNumber },
        });
        if (phoneExists) {
            throw new common_1.BadRequestException('User with this phone number already exists');
        }
        const roles = this.normalizeRoles(dto.roles);
        const created = await this.prisma.user.create({
            data: {
                email,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                middleNames: dto.middleNames?.trim() || null,
                position: dto.position.trim(),
                phoneNumber,
                telegramId: dto.telegramId ? BigInt(dto.telegramId) : null,
                roles,
                isActive: dto.isActive ?? true,
            },
            select: this.selectFields,
        });
        const spreadsheetId = this.config.getOrThrow('PROJECTS_SPREADSHEET_ID');
        const sheetName = this.config.get('USERS_SHEET_NAME', 'Uzytkownicy');
        const syncData = {
            id: created.id,
            email: created.email,
            first_name: created.firstName,
            last_name: created.lastName,
            middle_names: created.middleNames ?? '',
            position: created.position,
            phone_number: created.phoneNumber,
            roles: created.roles.join(', '),
            is_active: created.isActive ? 'TRUE' : 'FALSE',
        };
        try {
            await this.sheetsService.appendRow(spreadsheetId, sheetName, syncData);
        }
        catch (error) {
            await this.prisma.user.delete({ where: { id: created.id } });
            const errMsg = error instanceof Error ? error.message : String(error);
            const errorsSheet = this.config.get('SYNC_ERRORS_SHEET_NAME', 'SyncErrors');
            try {
                await this.sheetsService.appendRow(spreadsheetId, errorsSheet, {
                    timestamp: new Date().toISOString(),
                    action: 'CREATE_USER',
                    error_message: errMsg,
                    payload: JSON.stringify(syncData),
                });
            }
            catch (logErr) { }
            throw new common_1.InternalServerErrorException('Nie udało się zapisać użytkownika w Google Sheets');
        }
        return this.toView(created);
    }
    async update(id, dto) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
            select: this.selectFields,
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        const data = {};
        if (typeof dto.email === 'string') {
            const email = dto.email.trim().toLowerCase();
            const emailOwner = await this.prisma.user.findUnique({
                where: { email },
            });
            if (emailOwner && emailOwner.id !== id) {
                throw new common_1.BadRequestException('User with this email already exists');
            }
            data.email = email;
        }
        if (typeof dto.phoneNumber === 'string') {
            const phoneNumber = dto.phoneNumber.trim();
            const phoneOwner = await this.prisma.user.findUnique({
                where: { phoneNumber },
            });
            if (phoneOwner && phoneOwner.id !== id) {
                throw new common_1.BadRequestException('User with this phone number already exists');
            }
            data.phoneNumber = phoneNumber;
        }
        if (typeof dto.firstName === 'string')
            data.firstName = dto.firstName.trim();
        if (typeof dto.lastName === 'string')
            data.lastName = dto.lastName.trim();
        if (typeof dto.position === 'string')
            data.position = dto.position.trim();
        if (dto.middleNames === null) {
            data.middleNames = null;
        }
        else if (typeof dto.middleNames === 'string') {
            const middleNames = dto.middleNames.trim();
            data.middleNames = middleNames.length > 0 ? middleNames : null;
        }
        if (dto.telegramId === null) {
            data.telegramId = null;
        }
        else if (typeof dto.telegramId === 'string') {
            const telegramId = dto.telegramId.trim();
            data.telegramId = telegramId.length > 0 ? BigInt(telegramId) : null;
        }
        if (Array.isArray(dto.roles))
            data.roles = this.normalizeRoles(dto.roles);
        if (typeof dto.isActive === 'boolean')
            data.isActive = dto.isActive;
        const spreadsheetId = this.config.getOrThrow('PROJECTS_SPREADSHEET_ID');
        const sheetName = this.config.get('USERS_SHEET_NAME', 'Uzytkownicy');
        const syncData = {
            id: id,
            email: data.email ?? existing.email,
            first_name: data.firstName ?? existing.firstName,
            last_name: data.lastName ?? existing.lastName,
            middle_names: data.middleNames !== undefined ? (data.middleNames ?? '') : (existing.middleNames ?? ''),
            position: data.position ?? existing.position,
            phone_number: data.phoneNumber ?? existing.phoneNumber,
            roles: data.roles ? data.roles.join(', ') : existing.roles.join(', '),
            is_active: data.isActive !== undefined ? (data.isActive ? 'TRUE' : 'FALSE') : (existing.isActive ? 'TRUE' : 'FALSE'),
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
                    action: 'UPDATE_USER',
                    error_message: errMsg,
                    payload: JSON.stringify(syncData),
                });
            }
            catch (logErr) { }
            throw new common_1.InternalServerErrorException('Nie udało się zaktualizować użytkownika w Google Sheets');
        }
        const updated = await this.prisma.user.update({
            where: { id },
            data,
            select: this.selectFields,
        });
        return this.toView(updated);
    }
    async remove(id) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
            include: {
                project_department_foremen: { select: { id: true } },
                projects_projects_manager_idTousers: { select: { id: true } },
                projects_projects_created_byTousers: { select: { id: true } },
                projects_projects_updated_byTousers: { select: { id: true } },
                project_status_history: { select: { id: true } },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        if (existing.project_department_foremen.length > 0) {
            throw new common_1.BadRequestException('Nie można usunąć użytkownika, ponieważ jest przypisany jako st. brygadzista w projektach');
        }
        if (existing.projects_projects_manager_idTousers.length > 0) {
            throw new common_1.BadRequestException('Nie można usunąć użytkownika, ponieważ jest kierownikiem projektu');
        }
        if (existing.projects_projects_created_byTousers.length > 0 ||
            existing.projects_projects_updated_byTousers.length > 0 ||
            existing.project_status_history.length > 0) {
            throw new common_1.BadRequestException('Nie można usunąć użytkownika, ponieważ posiada powiązane logi lub historię zmian projektów');
        }
        await this.prisma.user.delete({
            where: { id },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        google_sheets_service_1.GoogleSheetsService])
], UsersService);
//# sourceMappingURL=users.service.js.map