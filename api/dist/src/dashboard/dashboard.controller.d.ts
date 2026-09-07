import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(request: any): Promise<{
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
