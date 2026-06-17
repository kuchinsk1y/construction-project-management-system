import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
