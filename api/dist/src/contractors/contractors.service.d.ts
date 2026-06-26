import { PrismaService } from '../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
export declare class ContractorsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }[]>;
    create(dto: CreateContractorDto): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    update(id: string, dto: UpdateContractorDto): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        tax_number: string | null;
        created_at: Date | null;
        updated_at: Date | null;
    }>;
}
