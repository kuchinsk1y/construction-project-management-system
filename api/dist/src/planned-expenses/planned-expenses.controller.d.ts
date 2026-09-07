import { PlannedExpensesService } from './planned-expenses.service';
import { CreatePlannedExpenseDto, UpdatePlannedExpenseDto } from './dto/planned-expense.dto';
export declare class PlannedExpensesController {
    private readonly plannedExpensesService;
    constructor(plannedExpensesService: PlannedExpensesService);
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
