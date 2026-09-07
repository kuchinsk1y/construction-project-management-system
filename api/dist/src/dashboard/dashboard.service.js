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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(user) {
        const isContractor = (user.roles || []).includes('CONTRACTOR');
        const projectsWhere = {
            deleted_at: null,
            status: 'IN_PROGRESS',
            ...(isContractor && user.contractorId ? { contractor_id: user.contractorId } : {})
        };
        const activeProjects = await this.prisma.projects.findMany({
            where: projectsWhere,
            select: { id: true, contract_net_value: true, name: true, end_date_contract: true }
        });
        const activeProjectsCount = activeProjects.length;
        const portfolioValue = activeProjects.reduce((sum, p) => sum + (Number(p.contract_net_value) || 0), 0);
        const projectIds = activeProjects.map(p => p.id);
        let pendingMilestones = [];
        if (projectIds.length > 0) {
            pendingMilestones = await this.prisma.milestones.findMany({
                where: {
                    project_id: { in: projectIds },
                    deleted_at: null,
                    percentage: { gte: 100 },
                    OR: [
                        { invoicing_percentage: null },
                        { invoicing_percentage: { lt: 100 } }
                    ]
                },
                include: {
                    projects: { select: { name: true } }
                },
                orderBy: { updated_at: 'desc' },
                take: 5
            });
        }
        const invoicingPlanValue = pendingMilestones.reduce((sum, m) => sum + (Number(m.net_amount) || 0), 0);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        let workersToday = 0;
        let recentReports = [];
        if (projectIds.length > 0) {
            const reportsToday = await this.prisma.daily_reports.findMany({
                where: {
                    project_id: { in: projectIds },
                    deleted_at: null,
                    report_date: { gte: startOfToday }
                },
                include: {
                    projects: { select: { name: true } },
                    project_work_types: { select: { name: true } }
                },
                orderBy: { report_date: 'desc' },
                take: 5
            });
            workersToday = reportsToday.reduce((sum, r) => sum + (r.actual_workers || 0), 0);
            recentReports = reportsToday;
        }
        return {
            kpi: {
                activeProjects: activeProjectsCount,
                portfolioValue,
                invoicingPlan: invoicingPlanValue,
                workersToday
            },
            attentionRequired: pendingMilestones.map(m => ({
                id: m.id,
                projectName: m.projects?.name,
                milestoneNo: m.milestone_no,
                description: m.description,
                netAmount: Number(m.net_amount) || 0
            })),
            recentActivity: recentReports.map(r => ({
                id: r.id,
                projectName: r.projects?.name,
                workName: r.project_work_types?.name,
                workers: r.actual_workers,
                hours: Number(r.actual_hours) || 0,
                createdAt: r.report_date
            }))
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map