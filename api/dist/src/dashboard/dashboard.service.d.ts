import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMetrics(): Promise<{
        kpi: {
            totalValue: number;
            totalInvoiced: number;
            totalPower: number;
            activeProjects: number;
            workersToday: number;
        };
        projectStatuses: {
            status: string;
            count: number;
        }[];
    }>;
}
