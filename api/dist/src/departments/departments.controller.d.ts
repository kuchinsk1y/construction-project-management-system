import { DepartmentsService } from './departments.service';
export declare class DepartmentsController {
    private readonly departmentsService;
    constructor(departmentsService: DepartmentsService);
    findAll(): Promise<{
        id: number;
        name: string;
        description: string | null;
        icon: string;
        is_active: boolean;
    }[]>;
    create(createDepartmentDto: {
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
    update(id: string, updateDepartmentDto: {
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
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
