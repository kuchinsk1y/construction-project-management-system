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
    async list() {
        return this.prisma.user.findMany({
            orderBy: [{ createdAt: 'desc' }],
            select: {
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
            },
        });
    }
    async create(dto) {
        const email = dto.email.trim().toLowerCase();
        const phoneNumber = dto.phoneNumber.trim();
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists) {
            throw new common_1.BadRequestException('User with this email already exists');
        }
        const phoneExists = await this.prisma.user.findUnique({ where: { phoneNumber } });
        if (phoneExists) {
            throw new common_1.BadRequestException('User with this phone number already exists');
        }
        const roles = (dto.roles ?? ['user'])
            .map((role) => role.trim())
            .filter((role) => role.length > 0);
        if (roles.length === 0) {
            throw new common_1.BadRequestException('Roles must contain at least one value');
        }
        return this.prisma.user.create({
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
            select: {
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
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map