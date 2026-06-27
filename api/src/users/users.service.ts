import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private selectFields = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    middleNames: true,
    position: true,
    phoneNumber: true,
    telegramId: true,
    isActive: true,
    roles: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private toView(record: DbUserRecord): UserView {
    return {
      ...record,
      telegramId: record.telegramId ? record.telegramId.toString() : null,
    };
  }

  private normalizeRoles(input?: string[]): string[] {
    const roles = (input ?? ['user'])
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    if (roles.length === 0) {
      throw new BadRequestException('Roles must contain at least one value');
    }

    return roles;
  }

  async list() {
    const rows = await this.prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: this.selectFields,
    });

    return rows.map((row) => this.toView(row));
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const phoneNumber = dto.phoneNumber.trim();

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException('User with this email already exists');
    }

    const phoneExists = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (phoneExists) {
      throw new BadRequestException(
        'User with this phone number already exists',
      );
    }

    const roles = this.normalizeRoles(dto.roles);

    const created = await this.prisma.user.create({
      data: {
        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        middleNames: dto.middleNames?.trim() || null,
        position: dto.position.trim(),
        phoneNumber,
        telegramId: dto.telegramId ? BigInt(dto.telegramId) : null,
        roles,
        isActive: dto.isActive ?? true,
      },
      select: this.selectFields,
    });

    return this.toView(created);
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: this.selectFields,
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      middleNames?: string | null;
      position?: string;
      phoneNumber?: string;
      telegramId?: bigint | null;
      roles?: string[];
      isActive?: boolean;
    } = {};

    if (typeof dto.email === 'string') {
      const email = dto.email.trim().toLowerCase();
      const emailOwner = await this.prisma.user.findUnique({
        where: { email },
      });
      if (emailOwner && emailOwner.id !== id) {
        throw new BadRequestException('User with this email already exists');
      }
      data.email = email;
    }

    if (typeof dto.phoneNumber === 'string') {
      const phoneNumber = dto.phoneNumber.trim();
      const phoneOwner = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (phoneOwner && phoneOwner.id !== id) {
        throw new BadRequestException(
          'User with this phone number already exists',
        );
      }
      data.phoneNumber = phoneNumber;
    }

    if (typeof dto.firstName === 'string')
      data.firstName = dto.firstName.trim();
    if (typeof dto.lastName === 'string') data.lastName = dto.lastName.trim();
    if (typeof dto.position === 'string') data.position = dto.position.trim();

    if (typeof dto.middleNames === 'string') {
      const middleNames = dto.middleNames.trim();
      data.middleNames = middleNames.length > 0 ? middleNames : null;
    }

    if (typeof dto.telegramId === 'string') {
      const telegramId = dto.telegramId.trim();
      data.telegramId = telegramId.length > 0 ? BigInt(telegramId) : null;
    }

    if (Array.isArray(dto.roles)) data.roles = this.normalizeRoles(dto.roles);
    if (typeof dto.isActive === 'boolean') data.isActive = dto.isActive;

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: this.selectFields,
    });

    return this.toView(updated);
  }
}
