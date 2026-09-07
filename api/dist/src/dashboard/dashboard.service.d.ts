import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(user: any): Promise<{
        kpi: {
            activeProjects: number;
            portfolioValue: number;
            invoicingPlan: any;
            workersToday: number;
        };
        attentionRequired: {
            id: any;
            projectName: any;
            milestoneNo: any;
            description: any;
            netAmount: number;
        }[];
        recentActivity: {
            id: any;
            projectName: any;
            workName: any;
            workers: any;
            hours: number;
            createdAt: any;
        }[];
    }>;
}
