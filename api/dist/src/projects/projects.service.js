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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
function sanitizeDecimals(obj) {
    return JSON.parse(JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'bigint')
            return Number(value);
        return value;
    }));
}
let ProjectsService = class ProjectsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        const rows = await this.prisma.projects.findMany({
            where: { deleted_at: null },
            include: {
                contractors: { select: { id: true, name: true } },
                project_types: { select: { id: true, name: true, code: true } },
                users_projects_manager_idTousers: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { created_at: 'desc' },
        });
        return rows.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            country: p.country,
            city: p.city,
            start_date_contract: p.start_date_contract?.toISOString().split('T')[0] ?? null,
            end_date_contract: p.end_date_contract?.toISOString().split('T')[0] ?? null,
            contract_net_value: p.contract_net_value?.toString() ?? null,
            currency: p.currency,
            created_at: p.created_at,
            updated_at: p.updated_at,
            contractors: p.contractors
                ? { id: p.contractors.id, name: p.contractors.name }
                : null,
            project_types: p.project_types
                ? {
                    id: Number(p.project_types.id),
                    name: p.project_types.name,
                    code: p.project_types.code,
                }
                : null,
            manager: p.users_projects_manager_idTousers
                ? {
                    id: p.users_projects_manager_idTousers.id,
                    firstName: p.users_projects_manager_idTousers.firstName,
                    lastName: p.users_projects_manager_idTousers.lastName,
                }
                : null,
        }));
    }
    async create(dto) {
        const project = await this.prisma.projects.create({
            data: {
                name: dto.name,
                contractor_id: dto.contractorId,
                project_type_id: BigInt(dto.projectTypeId),
                country: dto.country,
                city: dto.city,
                status: dto.status ?? 'DRAFT',
                currency: dto.currency ?? null,
                contract_net_value: dto.contractNetValue ?? null,
                start_date_contract: dto.startDateContract
                    ? new Date(dto.startDateContract)
                    : null,
                end_date_contract: dto.endDateContract
                    ? new Date(dto.endDateContract)
                    : null,
                manager_id: dto.managerId ?? null,
            },
            include: {
                contractors: { select: { id: true, name: true } },
                project_types: { select: { id: true, name: true, code: true } },
            },
        });
        return sanitizeDecimals({
            id: project.id,
            name: project.name,
            status: project.status,
            country: project.country,
            city: project.city,
            start_date_contract: project.start_date_contract?.toISOString().split('T')[0] ?? null,
            end_date_contract: project.end_date_contract?.toISOString().split('T')[0] ?? null,
            contract_net_value: project.contract_net_value?.toString() ?? null,
            currency: project.currency,
            contractors: project.contractors,
            project_types: project.project_types
                ? {
                    id: Number(project.project_types.id),
                    name: project.project_types.name,
                    code: project.project_types.code,
                }
                : null,
            manager: null,
        });
    }
    async listContractors() {
        return this.prisma.contractors.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
    }
    async listProjectTypes() {
        const rows = await this.prisma.project_types.findMany({
            select: { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({ id: Number(r.id), name: r.name, code: r.code }));
    }
    async update(id, dto) {
        const project = await this.prisma.projects.update({
            where: { id },
            data: {
                name: dto.name,
                contractor_id: dto.contractorId,
                project_type_id: dto.projectTypeId
                    ? BigInt(dto.projectTypeId)
                    : undefined,
                country: dto.country,
                city: dto.city,
                status: dto.status,
                currency: dto.currency ?? null,
                contract_net_value: dto.contractNetValue ?? null,
                start_date_contract: dto.startDateContract
                    ? new Date(dto.startDateContract)
                    : null,
                end_date_contract: dto.endDateContract
                    ? new Date(dto.endDateContract)
                    : null,
                manager_id: dto.managerId ?? null,
            },
            include: {
                contractors: { select: { id: true, name: true } },
                project_types: { select: { id: true, name: true, code: true } },
            },
        });
        return sanitizeDecimals({
            id: project.id,
            name: project.name,
            status: project.status,
            country: project.country,
            city: project.city,
            start_date_contract: project.start_date_contract?.toISOString().split('T')[0] ?? null,
            end_date_contract: project.end_date_contract?.toISOString().split('T')[0] ?? null,
            contract_net_value: project.contract_net_value?.toString() ?? null,
            currency: project.currency,
            contractors: project.contractors,
            project_types: project.project_types
                ? {
                    id: Number(project.project_types.id),
                    name: project.project_types.name,
                    code: project.project_types.code,
                }
                : null,
            manager: null,
        });
    }
    async delete(id) {
        return this.prisma.projects.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map