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
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
        const roles = (input ?? ['user'])
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
        if (typeof dto.middleNames === 'string') {
            const middleNames = dto.middleNames.trim();
            data.middleNames = middleNames.length > 0 ? middleNames : null;
        }
        if (typeof dto.telegramId === 'string') {
            const telegramId = dto.telegramId.trim();
            data.telegramId = telegramId.length > 0 ? BigInt(telegramId) : null;
        }
        if (Array.isArray(dto.roles))
            data.roles = this.normalizeRoles(dto.roles);
        if (typeof dto.isActive === 'boolean')
            data.isActive = dto.isActive;
        const updated = await this.prisma.user.update({
            where: { id },
            data,
            select: this.selectFields,
        });
        return this.toView(updated);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map