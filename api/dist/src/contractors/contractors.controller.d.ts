import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { ContractorsService } from './contractors.service';
export declare class ContractorsController {
    private readonly contractorsService;
    constructor(contractorsService: ContractorsService);
    list(): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }[]>;
    create(dto: CreateContractorDto): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    update(id: string, dto: UpdateContractorDto): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
}
