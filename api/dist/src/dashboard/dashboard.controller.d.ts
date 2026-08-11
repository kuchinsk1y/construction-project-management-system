import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
