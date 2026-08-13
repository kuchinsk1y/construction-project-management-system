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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
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
    syncQueue;
    constructor(prisma, syncQueue) {
        this.prisma = prisma;
        this.syncQueue = syncQueue;
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
            start_date_fact: p.start_date_fact?.toISOString().split('T')[0] ?? null,
            end_date_fact: p.end_date_fact?.toISOString().split('T')[0] ?? null,
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
            dokumentationUrl: p.dokumentation_url,
            pinUrl: p.pin_url,
            power: p.power ? Number(p.power) : null,
        }));
    }
    async ensureCurrencyExists(currencyCode) {
        if (!currencyCode)
            return;
        await this.prisma.currencies.upsert({
            where: { code: currencyCode },
            update: {},
            create: {
                code: currencyCode,
                name: currencyCode,
                symbol: currencyCode === 'PLN' ? 'zł' : currencyCode === 'EUR' ? '€' : '$',
            },
        });
    }
    async ensureProjectTypeExists(projectTypeId) {
        const defaultTypes = [
            {
                code: 'PV',
                name: 'Fotowoltaika (PV)',
                description: 'Instalacje i farmy fotowoltaiczne',
            },
            {
                code: 'MAGAZYN_ENERGII',
                name: 'Magazyn energii',
                description: 'Systemy magazynowania energii (BESS)',
            },
        ];
        if (projectTypeId) {
            const existing = await this.prisma.project_types.findUnique({
                where: { id: BigInt(projectTypeId) },
            });
            if (existing)
                return existing.id;
        }
        let firstId = null;
        for (const pt of defaultTypes) {
            const row = await this.prisma.project_types.upsert({
                where: { code: pt.code },
                update: {},
                create: pt,
            });
            if (!firstId)
                firstId = row.id;
        }
        return firstId ?? 1n;
    }
    async create(dto) {
        if (dto.currency) {
            await this.ensureCurrencyExists(dto.currency);
        }
        const projectTypeId = await this.ensureProjectTypeExists(dto.projectTypeId);
        const project = await this.prisma.projects.create({
            data: {
                name: dto.name,
                contractors: { connect: { id: dto.contractorId } },
                project_types: { connect: { id: projectTypeId } },
                country: dto.country,
                city: dto.city,
                status: dto.status ?? 'DRAFT',
                currencies: dto.currency
                    ? { connect: { code: dto.currency } }
                    : undefined,
                contract_net_value: dto.contractNetValue ?? null,
                start_date_contract: dto.startDateContract
                    ? new Date(dto.startDateContract)
                    : null,
                end_date_contract: dto.endDateContract
                    ? new Date(dto.endDateContract)
                    : null,
                start_date_fact: dto.startDateFact ? new Date(dto.startDateFact) : null,
                end_date_fact: dto.endDateFact ? new Date(dto.endDateFact) : null,
                users_projects_manager_idTousers: dto.managerId
                    ? { connect: { id: dto.managerId } }
                    : undefined,
                dokumentation_url: dto.dokumentationUrl ?? null,
                pin_url: dto.pinUrl ?? null,
                power: dto.power ?? null,
            },
            include: {
                contractors: { select: { id: true, name: true } },
                project_types: { select: { id: true, name: true, code: true } },
                users_projects_manager_idTousers: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        await this.syncQueue.add('sync-project', {
            projectId: project.id,
            action: 'create',
        });
        return sanitizeDecimals({
            id: project.id,
            name: project.name,
            status: project.status,
            country: project.country,
            city: project.city,
            start_date_contract: project.start_date_contract?.toISOString().split('T')[0] ?? null,
            end_date_contract: project.end_date_contract?.toISOString().split('T')[0] ?? null,
            start_date_fact: project.start_date_fact?.toISOString().split('T')[0] ?? null,
            end_date_fact: project.end_date_fact?.toISOString().split('T')[0] ?? null,
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
            manager: project.users_projects_manager_idTousers
                ? {
                    id: project.users_projects_manager_idTousers.id,
                    firstName: project.users_projects_manager_idTousers.firstName,
                    lastName: project.users_projects_manager_idTousers.lastName,
                }
                : null,
            dokumentationUrl: project.dokumentation_url,
            pinUrl: project.pin_url,
            power: project.power ? Number(project.power) : null,
        });
    }
    async listContractors() {
        return this.prisma.contractors.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
    }
    async listProjectTypes() {
        await this.ensureProjectTypeExists(null);
        const rows = await this.prisma.project_types.findMany({
            where: {
                code: { in: ['PV', 'MAGAZYN_ENERGII'] },
            },
            select: { id: true, name: true, code: true },
            orderBy: { id: 'asc' },
        });
        return rows.map((r) => ({ id: Number(r.id), name: r.name, code: r.code }));
    }
    async update(id, dto) {
        if (dto.currency) {
            await this.ensureCurrencyExists(dto.currency);
        }
        const projectTypeId = dto.projectTypeId
            ? await this.ensureProjectTypeExists(dto.projectTypeId)
            : undefined;
        const project = await this.prisma.projects.update({
            where: { id },
            data: {
                name: dto.name,
                contractors: dto.contractorId
                    ? { connect: { id: dto.contractorId } }
                    : undefined,
                project_types: projectTypeId
                    ? { connect: { id: projectTypeId } }
                    : undefined,
                country: dto.country,
                city: dto.city,
                status: dto.status,
                currencies: dto.currency
                    ? { connect: { code: dto.currency } }
                    : { disconnect: true },
                contract_net_value: dto.contractNetValue ?? null,
                start_date_contract: dto.startDateContract
                    ? new Date(dto.startDateContract)
                    : null,
                end_date_contract: dto.endDateContract
                    ? new Date(dto.endDateContract)
                    : null,
                start_date_fact: dto.startDateFact ? new Date(dto.startDateFact) : null,
                end_date_fact: dto.endDateFact ? new Date(dto.endDateFact) : null,
                users_projects_manager_idTousers: dto.managerId
                    ? { connect: { id: dto.managerId } }
                    : { disconnect: true },
                dokumentation_url: dto.dokumentationUrl,
                pin_url: dto.pinUrl,
                power: dto.power ?? null,
            },
            include: {
                contractors: { select: { id: true, name: true } },
                project_types: { select: { id: true, name: true, code: true } },
                users_projects_manager_idTousers: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        await this.syncQueue.add('sync-project', {
            projectId: project.id,
            action: 'update',
        });
        return sanitizeDecimals({
            id: project.id,
            name: project.name,
            status: project.status,
            country: project.country,
            city: project.city,
            start_date_contract: project.start_date_contract?.toISOString().split('T')[0] ?? null,
            end_date_contract: project.end_date_contract?.toISOString().split('T')[0] ?? null,
            start_date_fact: project.start_date_fact?.toISOString().split('T')[0] ?? null,
            end_date_fact: project.end_date_fact?.toISOString().split('T')[0] ?? null,
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
            manager: project.users_projects_manager_idTousers
                ? {
                    id: project.users_projects_manager_idTousers.id,
                    firstName: project.users_projects_manager_idTousers.firstName,
                    lastName: project.users_projects_manager_idTousers.lastName,
                }
                : null,
            dokumentationUrl: project.dokumentation_url,
            pinUrl: project.pin_url,
            power: project.power ? Number(project.power) : null,
        });
    }
    async delete(id) {
        await this.prisma.projects.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
        return { success: true };
    }
    async listMilestones(projectId) {
        const rows = await this.prisma.milestones.findMany({
            where: { project_id: projectId, deleted_at: null },
            orderBy: { milestone_no: 'asc' },
        });
        return rows.map((m) => ({
            id: m.id,
            projectId: m.project_id,
            milestoneNo: m.milestone_no,
            description: m.description,
            type: m.type ?? 'KM',
            percentage: m.percentage ? Number(m.percentage) : 0,
            netAmount: m.net_amount ? Number(m.net_amount) : 0,
            invoicingPercentage: m.invoicing_percentage
                ? Number(m.invoicing_percentage)
                : null,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
        }));
    }
    async createMilestone(projectId, dto) {
        const project = await this.prisma.projects.findUnique({
            where: { id: projectId, deleted_at: null },
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const milestoneType = dto.type ?? 'KM';
        let percentage = 0;
        let netAmount = 0;
        if (milestoneType === 'KM') {
            const existing = await this.prisma.milestones.findMany({
                where: { project_id: projectId, deleted_at: null },
            });
            const currentSum = existing.reduce((sum, m) => sum + Number(m.percentage ?? 0), 0);
            percentage = dto.percentage ?? 0;
            if (currentSum + percentage > 100) {
                throw new common_1.BadRequestException('Suma procentów kamieni milowych nie może przekraczać 100%');
            }
            const projectBudget = project.contract_net_value
                ? Number(project.contract_net_value)
                : 0;
            netAmount = (projectBudget * percentage) / 100;
        }
        else {
            percentage = 0;
            netAmount = dto.netAmount ?? 0;
        }
        const row = await this.prisma.milestones.create({
            data: {
                project_id: projectId,
                milestone_no: dto.milestoneNo,
                description: dto.description,
                type: milestoneType,
                percentage,
                net_amount: netAmount,
                invoicing_percentage: dto.invoicingPercentage ?? null,
            },
        });
        return {
            id: row.id,
            projectId: row.project_id,
            milestoneNo: row.milestone_no,
            description: row.description,
            type: row.type,
            percentage: Number(row.percentage),
            netAmount: Number(row.net_amount),
            invoicingPercentage: row.invoicing_percentage
                ? Number(row.invoicing_percentage)
                : null,
        };
    }
    async updateMilestone(id, dto) {
        const milestone = await this.prisma.milestones.findUnique({
            where: { id, deleted_at: null },
        });
        if (!milestone) {
            throw new common_1.NotFoundException('Milestone not found');
        }
        const milestoneType = dto.type ?? milestone.type ?? 'KM';
        let netAmount = undefined;
        let percentage = dto.percentage;
        if (milestoneType === 'KM') {
            if (dto.percentage !== undefined) {
                const existing = await this.prisma.milestones.findMany({
                    where: {
                        project_id: milestone.project_id,
                        deleted_at: null,
                        NOT: { id },
                    },
                });
                const currentSum = existing.reduce((sum, m) => sum + Number(m.percentage ?? 0), 0);
                if (currentSum + dto.percentage > 100) {
                    throw new common_1.BadRequestException('Suma procentów kamieni milowych nie może przekraczać 100%');
                }
                const project = await this.prisma.projects.findUnique({
                    where: { id: milestone.project_id },
                });
                const projectBudget = project?.contract_net_value
                    ? Number(project.contract_net_value)
                    : 0;
                netAmount = (projectBudget * dto.percentage) / 100;
            }
        }
        else {
            percentage = 0;
            netAmount = dto.netAmount;
        }
        const row = await this.prisma.milestones.update({
            where: { id },
            data: {
                milestone_no: dto.milestoneNo,
                description: dto.description,
                type: milestoneType,
                percentage,
                net_amount: netAmount,
                invoicing_percentage: dto.invoicingPercentage,
            },
        });
        return {
            id: row.id,
            projectId: row.project_id,
            milestoneNo: row.milestone_no,
            description: row.description,
            type: row.type,
            percentage: Number(row.percentage),
            netAmount: Number(row.net_amount),
            invoicingPercentage: row.invoicing_percentage
                ? Number(row.invoicing_percentage)
                : null,
        };
    }
    async deleteMilestone(id) {
        const milestone = await this.prisma.milestones.findUnique({
            where: { id, deleted_at: null },
        });
        if (!milestone) {
            throw new common_1.NotFoundException('Milestone not found');
        }
        await this.prisma.milestones.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
        return { success: true };
    }
    async listDepartments() {
        let list = await this.prisma.departments.findMany({
            where: { is_active: true },
            orderBy: { id: 'asc' },
        });
        if (list.length === 0) {
            const defaultDeps = [
                'Kafar',
                'Montaż',
                'Elektryka',
                'Maszyny budowlane',
                'Kable AC',
            ];
            await this.prisma.departments.createMany({
                data: defaultDeps.map((name) => ({ name })),
            });
            list = await this.prisma.departments.findMany({
                where: { is_active: true },
                orderBy: { id: 'asc' },
            });
        }
        return list.map((d) => ({ id: Number(d.id), name: d.name }));
    }
    async listForemen() {
        const users = await this.prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true, roles: true },
        });
        return users
            .filter((u) => u.roles.some((r) => r.toLowerCase() === 'foreman' || r.toLowerCase() === 'brygadzista'))
            .map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
        }));
    }
    async listWorkTypes(projectId) {
        const rows = await this.prisma.project_work_types.findMany({
            where: { project_id: projectId, deleted_at: null },
            include: {
                milestones: { select: { id: true, milestone_no: true } },
                departments: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
        });
        return rows.map((w) => ({
            id: w.id,
            projectId: w.project_id,
            milestoneId: w.milestone_id,
            milestoneNo: w.milestones?.milestone_no ?? '',
            departmentId: Number(w.department_id),
            departmentName: w.departments?.name ?? '',
            name: w.name,
            unit: w.unit,
            percentage: w.percentage ? Number(w.percentage) : null,
            totalQuantity: w.total_quantity ? Number(w.total_quantity) : 0,
            plannedStart: w.planned_start
                ? w.planned_start.toISOString().split('T')[0]
                : null,
            plannedEnd: w.planned_end
                ? w.planned_end.toISOString().split('T')[0]
                : null,
        }));
    }
    async createWorkType(projectId, dto) {
        const row = await this.prisma.project_work_types.create({
            data: {
                project_id: projectId,
                milestone_id: dto.milestoneId ?? null,
                department_id: BigInt(dto.departmentId),
                name: dto.name,
                unit: dto.unit ?? null,
                percentage: dto.percentage ?? null,
                total_quantity: dto.totalQuantity ?? null,
                planned_start: dto.plannedStart ? new Date(dto.plannedStart) : null,
                planned_end: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
            },
        });
        return {
            id: row.id,
            projectId: row.project_id,
            milestoneId: row.milestone_id,
            departmentId: Number(row.department_id),
            name: row.name,
            unit: row.unit,
            percentage: row.percentage ? Number(row.percentage) : null,
            totalQuantity: row.total_quantity ? Number(row.total_quantity) : 0,
        };
    }
    async updateWorkType(id, dto) {
        const row = await this.prisma.project_work_types.update({
            where: { id },
            data: {
                milestone_id: dto.milestoneId,
                department_id: dto.departmentId ? BigInt(dto.departmentId) : undefined,
                name: dto.name,
                unit: dto.unit,
                percentage: dto.percentage !== undefined ? dto.percentage : undefined,
                total_quantity: dto.totalQuantity,
                planned_start: dto.plannedStart
                    ? new Date(dto.plannedStart)
                    : undefined,
                planned_end: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
            },
        });
        return {
            id: row.id,
            name: row.name,
            unit: row.unit,
            percentage: row.percentage ? Number(row.percentage) : null,
            totalQuantity: row.total_quantity ? Number(row.total_quantity) : 0,
        };
    }
    async deleteWorkType(id) {
        await this.prisma.project_work_types.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
        return { success: true };
    }
    async listProjectDepartments(projectId) {
        const rows = await this.prisma.project_departments.findMany({
            where: { project_id: projectId },
            include: {
                departments: { select: { id: true, name: true, icon: true, is_active: true } },
            },
            orderBy: { created_at: 'asc' },
        });
        return rows.map((r) => ({
            projectId: r.project_id,
            departmentId: Number(r.department_id),
            departmentName: r.departments?.name ?? '',
            departmentIcon: r.departments?.icon ?? 'Folder',
            departmentIsActive: r.departments?.is_active ?? true,
            createdAt: r.created_at ? r.created_at.toISOString() : null,
        }));
    }
    async addProjectDepartment(projectId, departmentId) {
        const exists = await this.prisma.project_departments.findUnique({
            where: {
                project_id_department_id: {
                    project_id: projectId,
                    department_id: BigInt(departmentId),
                },
            },
        });
        if (exists) {
            throw new Error('Department is already added to this project');
        }
        const row = await this.prisma.project_departments.create({
            data: {
                project_id: projectId,
                department_id: BigInt(departmentId),
            },
            include: {
                departments: { select: { id: true, name: true, icon: true, is_active: true } },
            },
        });
        return {
            projectId: row.project_id,
            departmentId: Number(row.department_id),
            departmentName: row.departments?.name ?? '',
            departmentIcon: row.departments?.icon ?? 'Folder',
            departmentIsActive: row.departments?.is_active ?? true,
            createdAt: row.created_at ? row.created_at.toISOString() : null,
        };
    }
    async removeProjectDepartment(projectId, departmentId) {
        await this.prisma.$transaction(async (tx) => {
            await tx.project_department_foremen.deleteMany({
                where: {
                    project_id: projectId,
                    department_id: BigInt(departmentId),
                },
            });
            await tx.project_departments.delete({
                where: {
                    project_id_department_id: {
                        project_id: projectId,
                        department_id: BigInt(departmentId),
                    },
                },
            });
        });
        return { success: true };
    }
    async listForemenAssignments(projectId) {
        const rows = await this.prisma.project_department_foremen.findMany({
            where: { project_id: projectId },
            include: {
                departments: { select: { id: true, name: true } },
                users: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { assigned_at: 'asc' },
        });
        return rows.map((f) => ({
            id: f.id,
            projectId: f.project_id,
            departmentId: Number(f.department_id),
            departmentName: f.departments?.name ?? '',
            foremanId: f.foreman_id,
            foremanName: f.users
                ? `${f.users.firstName} ${f.users.lastName}`.trim()
                : '',
        }));
    }
    async bulkAssignForemen(projectId, assignments) {
        await this.prisma.$transaction(async (tx) => {
            await tx.project_department_foremen.deleteMany({
                where: { project_id: projectId },
            });
            const dataToInsert = [];
            for (const group of assignments) {
                for (const fId of group.foremanIds) {
                    dataToInsert.push({
                        project_id: projectId,
                        department_id: BigInt(group.departmentId),
                        foreman_id: fId,
                    });
                }
            }
            if (dataToInsert.length > 0) {
                await tx.project_department_foremen.createMany({
                    data: dataToInsert,
                });
            }
        });
        return { success: true };
    }
    async batchSyncDepartments(projectId, assignments) {
        await this.prisma.$transaction(async (tx) => {
            const activeDepartmentIds = assignments.map((a) => BigInt(a.departmentId));
            if (activeDepartmentIds.length > 0) {
                await tx.project_departments.deleteMany({
                    where: {
                        project_id: projectId,
                        department_id: { notIn: activeDepartmentIds },
                    },
                });
            }
            else {
                await tx.project_departments.deleteMany({
                    where: { project_id: projectId },
                });
            }
            for (const a of assignments) {
                await tx.project_departments.upsert({
                    where: {
                        project_id_department_id: {
                            project_id: projectId,
                            department_id: BigInt(a.departmentId),
                        },
                    },
                    update: {},
                    create: {
                        project_id: projectId,
                        department_id: BigInt(a.departmentId),
                    },
                });
            }
            await tx.project_department_foremen.deleteMany({
                where: { project_id: projectId },
            });
            const foremenToInsert = [];
            for (const a of assignments) {
                for (const fId of a.foremanIds) {
                    foremenToInsert.push({
                        project_id: projectId,
                        department_id: BigInt(a.departmentId),
                        foreman_id: fId,
                    });
                }
            }
            if (foremenToInsert.length > 0) {
                await tx.project_department_foremen.createMany({ data: foremenToInsert });
            }
            const incomingWorkIds = assignments
                .flatMap((a) => a.works.filter((w) => w.id).map((w) => w.id));
            if (incomingWorkIds.length > 0) {
                await tx.project_work_types.updateMany({
                    where: {
                        project_id: projectId,
                        id: { notIn: incomingWorkIds },
                        deleted_at: null,
                    },
                    data: { deleted_at: new Date() },
                });
            }
            else {
                await tx.project_work_types.updateMany({
                    where: {
                        project_id: projectId,
                        deleted_at: null,
                    },
                    data: { deleted_at: new Date() },
                });
            }
            for (const a of assignments) {
                for (const w of a.works) {
                    if (w.id) {
                        await tx.project_work_types.update({
                            where: { id: w.id },
                            data: {
                                name: w.name,
                                department_id: BigInt(a.departmentId),
                            },
                        });
                    }
                    else {
                        await tx.project_work_types.create({
                            data: {
                                project_id: projectId,
                                department_id: BigInt(a.departmentId),
                                name: w.name,
                            },
                        });
                    }
                }
            }
        });
        return { success: true };
    }
    async listResourcePlans(workTypeId) {
        const rows = await this.prisma.resource_plans.findMany({
            where: { work_type_id: workTypeId },
            orderBy: { date_from: 'asc' },
        });
        return rows.map((r) => ({
            id: r.id,
            workTypeId: r.work_type_id,
            plannedWorkers: r.planned_workers ?? 0,
            dateFrom: r.date_from ? r.date_from.toISOString().split('T')[0] : null,
            dateTo: r.date_to ? r.date_to.toISOString().split('T')[0] : null,
        }));
    }
    async createResourcePlan(workTypeId, dto) {
        const row = await this.prisma.resource_plans.create({
            data: {
                work_type_id: workTypeId,
                planned_workers: dto.plannedWorkers,
                date_from: dto.dateFrom ? new Date(dto.dateFrom) : null,
                date_to: dto.dateTo ? new Date(dto.dateTo) : null,
            },
        });
        return {
            id: row.id,
            workTypeId: row.work_type_id,
            plannedWorkers: row.planned_workers ?? 0,
            dateFrom: row.date_from
                ? row.date_from.toISOString().split('T')[0]
                : null,
            dateTo: row.date_to ? row.date_to.toISOString().split('T')[0] : null,
        };
    }
    async deleteResourcePlan(id) {
        await this.prisma.resource_plans.delete({
            where: { id },
        });
        return { success: true };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('projects-sync')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map