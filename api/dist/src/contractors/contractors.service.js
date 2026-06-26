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
exports.ContractorsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ContractorsService = class ContractorsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        return this.prisma.contractors.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async create(dto) {
        const name = dto.name.trim();
        const tax_number = dto.tax_number?.trim() || null;
        const exists = await this.prisma.contractors.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (exists) {
            throw new common_1.BadRequestException('Kontrahent o takiej nazwie już istnieje');
        }
        return this.prisma.contractors.create({
            data: {
                name,
                tax_number,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.contractors.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Kontrahent nie został znaleziony');
        }
        const data = {};
        if (typeof dto.name === 'string') {
            const name = dto.name.trim();
            const exists = await this.prisma.contractors.findFirst({
                where: {
                    name: { equals: name, mode: 'insensitive' },
                    id: { not: id },
                },
            });
            if (exists) {
                throw new common_1.BadRequestException('Kontrahent o takiej nazwie już istnieje');
            }
            data.name = name;
        }
        if (dto.tax_number !== undefined) {
            data.tax_number = dto.tax_number?.trim() || null;
        }
        return this.prisma.contractors.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        const existing = await this.prisma.contractors.findUnique({
            where: { id },
            include: {
                projects: { select: { id: true } },
                users: { select: { id: true } },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Kontrahent nie został znaleziony');
        }
        if (existing.projects.length > 0) {
            throw new common_1.BadRequestException('Nie można usunąć kontrahenta, ponieważ posiada on przypisane projekty');
        }
        if (existing.users.length > 0) {
            throw new common_1.BadRequestException('Nie można usunąć kontrahenta, ponieważ posiada on przypisanych użytkowników');
        }
        return this.prisma.contractors.delete({
            where: { id },
        });
    }
};
exports.ContractorsService = ContractorsService;
exports.ContractorsService = ContractorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContractorsService);
//# sourceMappingURL=contractors.service.js.map