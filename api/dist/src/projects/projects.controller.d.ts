import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { CreateResourcePlanDto } from './dto/create-resource-plan.dto';
import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    list(): Promise<{
        id: string;
        name: string;
        status: string;
        country: string;
        city: string;
        start_date_contract: string | null;
        end_date_contract: string | null;
        start_date_fact: string | null;
        end_date_fact: string | null;
        contract_net_value: string | null;
        currency: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        contractors: {
            id: string;
            name: string;
        } | null;
        project_types: {
            id: number;
            name: string;
            code: string;
        } | null;
        manager: {
            id: number;
            firstName: string;
            lastName: string;
        } | null;
    }[]>;
    create(dto: CreateProjectDto): Promise<Record<string, unknown>>;
    update(id: string, dto: UpdateProjectDto): Promise<Record<string, unknown>>;
    listContractors(): Promise<{
        id: string;
        name: string;
    }[]>;
    listProjectTypes(): Promise<{
        id: number;
        name: string;
        code: string;
    }[]>;
    listDepartments(): Promise<{
        id: number;
        name: string;
    }[]>;
    listForemen(): Promise<{
        id: number;
        firstName: string;
        lastName: string;
    }[]>;
    delete(id: string): Promise<{
        id: string;
        contractor_id: string;
        name: string;
        city: string;
        country: string;
        created_at: Date | null;
        updated_at: Date | null;
        project_type_id: bigint;
        manager_id: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        start_date_contract: Date | null;
        end_date_contract: Date | null;
        start_date_fact: Date | null;
        end_date_fact: Date | null;
        contract_net_value: import("@prisma/client-runtime-utils").Decimal | null;
        currency: string | null;
        vat_rate: import("@prisma/client-runtime-utils").Decimal | null;
        payment_term_days: number | null;
        warranty_percent: import("@prisma/client-runtime-utils").Decimal | null;
        warranty_months: number | null;
        status: string;
        hold_reason: string | null;
        hold_started_at: Date | null;
        expected_resume_date: Date | null;
        google_drive_folder_id: string | null;
        deleted_at: Date | null;
        created_by: number | null;
        updated_by: number | null;
    }>;
    listMilestones(projectId: string): Promise<{
        id: string;
        projectId: string;
        milestoneNo: string;
        description: string;
        percentage: number;
        netAmount: number;
        invoicingPercentage: number | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    createMilestone(projectId: string, dto: CreateMilestoneDto): Promise<{
        id: string;
        projectId: string;
        milestoneNo: string;
        description: string;
        percentage: number;
        netAmount: number;
        invoicingPercentage: number | null;
    }>;
    updateMilestone(id: string, dto: UpdateMilestoneDto): Promise<{
        id: string;
        projectId: string;
        milestoneNo: string;
        description: string;
        percentage: number;
        netAmount: number;
        invoicingPercentage: number | null;
    }>;
    deleteMilestone(id: string): Promise<{
        success: boolean;
    }>;
    listWorkTypes(projectId: string): Promise<{
        id: string;
        projectId: string;
        milestoneId: string;
        milestoneNo: string;
        departmentId: number;
        departmentName: string;
        name: string;
        unit: string | null;
        totalQuantity: number;
        plannedStart: string | null;
        plannedEnd: string | null;
    }[]>;
    createWorkType(projectId: string, dto: CreateWorkTypeDto): Promise<{
        id: string;
        projectId: string;
        milestoneId: string;
        departmentId: number;
        name: string;
        unit: string | null;
        totalQuantity: number;
    }>;
    updateWorkType(id: string, dto: Partial<CreateWorkTypeDto>): Promise<{
        id: string;
        name: string;
        unit: string | null;
        totalQuantity: number;
    }>;
    deleteWorkType(id: string): Promise<{
        success: boolean;
    }>;
    listForemenAssignments(projectId: string): Promise<{
        id: string;
        projectId: string;
        departmentId: number;
        departmentName: string;
        foremanId: number;
        foremanName: string;
    }[]>;
    assignForeman(projectId: string, body: {
        departmentId: number;
        foremanId: number;
    }): Promise<{
        id: string;
        updated: boolean;
        created?: undefined;
    } | {
        id: string;
        created: boolean;
        updated?: undefined;
    }>;
    listResourcePlans(workTypeId: string): Promise<{
        id: string;
        workTypeId: string;
        plannedWorkers: number;
        dateFrom: string | null;
        dateTo: string | null;
    }[]>;
    createResourcePlan(workTypeId: string, dto: CreateResourcePlanDto): Promise<{
        id: string;
        workTypeId: string;
        plannedWorkers: number;
        dateFrom: string | null;
        dateTo: string | null;
    }>;
    deleteResourcePlan(id: string): Promise<{
        success: boolean;
    }>;
}
