import { PrismaService } from '../prisma/prisma.service';
export declare class IntegrationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get detailedIncludes();
    listActiveProjects(): Promise<{
        milestones: any;
        works: any;
        plannedExpenses: any;
        departments: any;
        id: any;
        name: any;
        status: any;
        type: any;
        location: {
            country: any;
            city: any;
        };
        dates: {
            contractStart: any;
            contractEnd: any;
            factStart: any;
            factEnd: any;
        };
        financials: {
            netValue: number | null;
            currency: any;
        };
        contractor: {
            id: any;
            name: any;
        } | null;
        manager: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        } | null;
        power: number | null;
    }[]>;
    getProjectDetails(id: string): Promise<{
        milestones: any;
        works: any;
        plannedExpenses: any;
        departments: any;
        id: any;
        name: any;
        status: any;
        type: any;
        location: {
            country: any;
            city: any;
        };
        dates: {
            contractStart: any;
            contractEnd: any;
            factStart: any;
            factEnd: any;
        };
        financials: {
            netValue: number | null;
            currency: any;
        };
        contractor: {
            id: any;
            name: any;
        } | null;
        manager: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
        } | null;
        power: number | null;
    }>;
    private mapDetailedProject;
    private mapBasicProject;
}
