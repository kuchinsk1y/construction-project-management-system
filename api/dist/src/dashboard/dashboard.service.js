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
    async getMetrics() {
        const projects = await this.prisma.projects.findMany({
            where: { deleted_at: null },
            select: {
                status: true,
                contract_net_value: true,
                power: true,
            }
        });
        let totalValue = 0;
        let totalPower = 0;
        let activeProjects = 0;
        const statuses = {};
        for (const p of projects) {
            if (p.contract_net_value) {
                totalValue += Number(p.contract_net_value);
            }
            if (p.power) {
                totalPower += Number(p.power);
            }
            if (p.status === 'IN_PROGRESS') {
                activeProjects++;
            }
            statuses[p.status] = (statuses[p.status] || 0) + 1;
        }
        const invoicesResult = await this.prisma.milestones_invoices.aggregate({
            _sum: { net_value: true },
        });
        const totalInvoiced = invoicesResult._sum.net_value ? Number(invoicesResult._sum.net_value) : 0;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const reportsResult = await this.prisma.daily_reports.aggregate({
            where: {
                report_date: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
                deleted_at: null,
            },
            _sum: { actual_workers: true },
        });
        const workersToday = reportsResult._sum.actual_workers || 0;
        return {
            kpi: {
                totalValue,
                totalInvoiced,
                totalPower,
                activeProjects,
                workersToday,
            },
            projectStatuses: Object.entries(statuses).map(([status, count]) => ({ status, count })),
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map