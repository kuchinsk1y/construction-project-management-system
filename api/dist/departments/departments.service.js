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
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DepartmentsService = class DepartmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
        return { ...created, id: Number(created.id) };
    }
    async update(id, data) {
        const existing = await this.prisma.departments.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Department not found');
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map