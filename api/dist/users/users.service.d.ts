import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
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
    private readonly config;
    private readonly sheetsService;
    constructor(prisma: PrismaService, config: ConfigService, sheetsService: GoogleSheetsService);
    private selectFields;
    private toView;
    private normalizeRoles;
    list(): Promise<UserView[]>;
    create(dto: CreateUserDto): Promise<UserView>;
    update(id: number, dto: UpdateUserDto): Promise<UserView>;
    remove(id: number): Promise<void>;
}
export {};
