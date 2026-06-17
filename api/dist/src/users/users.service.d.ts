import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
        email: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        middleNames: string | null;
        position: string;
        phoneNumber: string;
        telegramId: bigint | null;
        isActive: boolean;
        roles: string[];
    }[]>;
    create(dto: CreateUserDto): Promise<{
        email: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        middleNames: string | null;
        position: string;
        phoneNumber: string;
        telegramId: bigint | null;
        isActive: boolean;
        roles: string[];
    }>;
}
