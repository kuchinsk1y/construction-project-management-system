import { PrismaService } from '../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
export declare class ContractorsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
        id: string;
        name: string;
        country: string | null;
        city: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        short_name: string | null;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        notes: string | null;
    }[]>;
    create(dto: CreateContractorDto): Promise<{
        id: string;
        name: string;
        country: string | null;
        city: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        short_name: string | null;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        notes: string | null;
    }>;
    update(id: string, dto: UpdateContractorDto): Promise<{
        id: string;
        name: string;
        country: string | null;
        city: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        short_name: string | null;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        notes: string | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        country: string | null;
        city: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        short_name: string | null;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        notes: string | null;
    }>;
}
