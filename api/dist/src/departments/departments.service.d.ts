import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
export declare class DepartmentsService {
    private prisma;
    private config;
    private sheetsService;
    constructor(prisma: PrismaService, config: ConfigService, sheetsService: GoogleSheetsService);
    findAll(): Promise<{
        id: number;
        name: string;
        description: string | null;
        icon: string;
        is_active: boolean;
    }[]>;
    create(data: {
        name: string;
        description?: string;
        icon?: string;
        is_active?: boolean;
    }): Promise<{
        id: number;
        name: string;
        description: string | null;
        icon: string;
        is_active: boolean;
    }>;
    update(id: bigint, data: {
        name?: string;
        description?: string;
        icon?: string;
        is_active?: boolean;
    }): Promise<{
        id: number;
        name: string;
        description: string | null;
        icon: string;
        is_active: boolean;
    }>;
    remove(id: bigint): Promise<{
        success: boolean;
    }>;
}
