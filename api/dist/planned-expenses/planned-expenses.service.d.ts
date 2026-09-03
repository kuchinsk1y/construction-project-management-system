import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { ConfigService } from '@nestjs/config';
import { CreatePlannedExpenseDto, UpdatePlannedExpenseDto } from './dto/planned-expense.dto';
export declare class PlannedExpensesService {
    private readonly prisma;
    private readonly sheetsService;
    private readonly config;
    constructor(prisma: PrismaService, sheetsService: GoogleSheetsService, config: ConfigService);
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
