import { PrismaService } from '../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
export declare class ContractorsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        short_name: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }[]>;
    create(dto: CreateContractorDto): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        short_name: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    update(id: string, dto: UpdateContractorDto): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        short_name: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    delete(id: string): Promise<{
        name: string;
        id: string;
        tax_number: string | null;
        street: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        notes: string | null;
        short_name: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
}
