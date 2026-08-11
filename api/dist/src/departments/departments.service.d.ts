import { PrismaService } from '../prisma/prisma.service';
export declare class DepartmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        name: string;
        description: string | null;
        is_active: boolean;
    }[]>;
    create(data: {
        name: string;
        description?: string;
        is_active?: boolean;
    }): Promise<{
        id: number;
        name: string;
        description: string | null;
        is_active: boolean;
    }>;
    update(id: bigint, data: {
        name?: string;
        description?: string;
        is_active?: boolean;
    }): Promise<{
        id: number;
        name: string;
        description: string | null;
        is_active: boolean;
    }>;
    remove(id: bigint): Promise<{
        success: boolean;
    }>;
}
