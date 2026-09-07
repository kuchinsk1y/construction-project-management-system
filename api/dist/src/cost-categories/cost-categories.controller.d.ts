import { PrismaService } from '../prisma/prisma.service';
export declare class CreateCostCategoryDto {
    name: string;
    isSalary?: boolean;
}
export declare class CostCategoriesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        name: string;
        isSalary: boolean | null;
    }[]>;
    create(dto: CreateCostCategoryDto): Promise<{
        id: string;
        name: string;
        isSalary: boolean | null;
    }>;
}
