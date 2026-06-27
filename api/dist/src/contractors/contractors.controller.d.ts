import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { ContractorsService } from './contractors.service';
export declare class ContractorsController {
    private readonly contractorsService;
    constructor(contractorsService: ContractorsService);
    list(): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }[]>;
    create(dto: CreateContractorDto): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    update(id: string, dto: UpdateContractorDto): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    delete(id: string): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
}
