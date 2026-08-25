import { PrismaService } from '../prisma/prisma.service';
export declare class CreatePlannedExpenseDto {
    costCategoryId: string;
    plannedPercent: number;
}
export declare class UpdatePlannedExpenseDto {
    costCategoryId?: string;
    plannedPercent?: number;
}
export declare class PlannedExpensesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(projectId: string): Promise<{
        id: string;
        projectId: string;
        costCategoryId: string;
        costCategoryName: string;
        plannedPercent: number;
    }[]>;
    create(projectId: string, dto: CreatePlannedExpenseDto): Promise<{
        id: string;
        projectId: string;
        costCategoryId: string;
        costCategoryName: string;
        plannedPercent: number;
    }>;
    update(projectId: string, id: string, dto: UpdatePlannedExpenseDto): Promise<{
        id: string;
        projectId: string;
        costCategoryId: string;
        costCategoryName: string;
        plannedPercent: number;
    }>;
    remove(projectId: string, id: string): Promise<{
        success: boolean;
    }>;
}
