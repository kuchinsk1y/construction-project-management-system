import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: {
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
      },
    });
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const phoneNumber = dto.phoneNumber.trim();

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException('User with this email already exists');
    }

    const phoneExists = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (phoneExists) {
      throw new BadRequestException('User with this phone number already exists');
    }

    const roles = (dto.roles ?? ['user'])
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    if (roles.length === 0) {
      throw new BadRequestException('Roles must contain at least one value');
    }

    return this.prisma.user.create({
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
      select: {
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
      },
    });
  }
}
