import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateWorkTypeDto } from './dto/create-work-type.dto';
import { CreateResourcePlanDto } from './dto/create-resource-plan.dto';
export declare class ProjectsService {
    private readonly prisma;
    private readonly syncQueue;
    constructor(prisma: PrismaService, syncQueue: Queue);
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
        dokumentationUrl: string | null;
        pinUrl: string | null;
        power: number | null;
    }[]>;
    private ensureCurrencyExists;
    private ensureProjectTypeExists;
    create(dto: CreateProjectDto): Promise<Record<string, unknown>>;
    listContractors(): Promise<{
        id: string;
        name: string;
    }[]>;
    listProjectTypes(): Promise<{
        id: number;
        name: string;
        code: string;
    }[]>;
    update(id: string, dto: UpdateProjectDto): Promise<Record<string, unknown>>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    listMilestones(projectId: string): Promise<{
        id: string;
        projectId: string;
        milestoneNo: string;
        description: string;
        type: string;
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
        type: string;
        percentage: number;
        netAmount: number;
        invoicingPercentage: number | null;
    }>;
    updateMilestone(id: string, dto: UpdateMilestoneDto): Promise<{
        id: string;
        projectId: string;
        milestoneNo: string;
        description: string;
        type: string;
        percentage: number;
        netAmount: number;
        invoicingPercentage: number | null;
    }>;
    deleteMilestone(id: string): Promise<{
        success: boolean;
    }>;
    listDepartments(): Promise<{
        id: number;
        name: string;
    }[]>;
    listForemen(): Promise<{
        id: number;
        firstName: string;
        lastName: string;
    }[]>;
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
    assignForeman(projectId: string, departmentId: number, foremanId: number): Promise<{
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
