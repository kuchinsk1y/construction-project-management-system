import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
type DbUserRecord = {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    middleNames: string | null;
    position: string;
    phoneNumber: string;
    telegramId: bigint | null;
    isActive: boolean;
    roles: string[];
    createdAt: Date;
    updatedAt: Date;
};
type UserView = Omit<DbUserRecord, 'telegramId'> & {
    telegramId: string | null;
};
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private selectFields;
    private toView;
    private normalizeRoles;
    list(): Promise<UserView[]>;
    create(dto: CreateUserDto): Promise<UserView>;
    update(id: number, dto: UpdateUserDto): Promise<UserView>;
}
export {};
