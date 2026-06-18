import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(): Promise<(Omit<{
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
    }, "telegramId"> & {
        telegramId: string | null;
    })[]>;
    create(dto: CreateUserDto): Promise<Omit<{
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
    }, "telegramId"> & {
        telegramId: string | null;
    }>;
    update(id: number, dto: UpdateUserDto): Promise<Omit<{
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
    }, "telegramId"> & {
        telegramId: string | null;
    }>;
}
