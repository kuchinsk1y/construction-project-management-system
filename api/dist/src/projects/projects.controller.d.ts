import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
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
    delete(id: string): Promise<{
        id: string;
        contractor_id: string;
        name: string;
        status: string;
        country: string;
        city: string;
        currency: string | null;
        project_type_id: bigint;
        manager_id: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        start_date_contract: Date | null;
        end_date_contract: Date | null;
        start_date_fact: Date | null;
        end_date_fact: Date | null;
        contract_net_value: import("@prisma/client-runtime-utils").Decimal | null;
        vat_rate: import("@prisma/client-runtime-utils").Decimal | null;
        payment_term_days: number | null;
        warranty_percent: import("@prisma/client-runtime-utils").Decimal | null;
        warranty_months: number | null;
        hold_reason: string | null;
        hold_started_at: Date | null;
        expected_resume_date: Date | null;
        google_drive_folder_id: string | null;
        deleted_at: Date | null;
        created_by: number | null;
        updated_by: number | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
}
