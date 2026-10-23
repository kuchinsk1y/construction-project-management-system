import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService, type CreateProtocolInput, type UpdateInvoiceInput } from './invoices.service';

/** Who may request invoices by closing works */
const CREATE_ROLES = ['admin', 'administrator', 'operational_director', 'project_manager'];
/** Who manages invoices: number, Fakturownia link, status, payment */
const MANAGE_ROLES = ['admin', 'administrator', 'financial_director'];
const STAFF_ROLES = [...new Set([...CREATE_ROLES, ...MANAGE_ROLES, 'viewer'])];

@Controller()
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('projects/:projectId/invoices')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    await this.requireRole(authorization, STAFF_ROLES);
    return this.invoices.list(projectId);
  }

  /** Closes works with an acceptance protocol: multipart with `protocol` (file) and `data` (JSON) */
  @Post('projects/:projectId/invoices')
  @UseInterceptors(FileInterceptor('protocol', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body('data') data: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const userId = await this.requireRole(authorization, CREATE_ROLES);
    return this.invoices.create(projectId, userId, this.parseCreate(data), file);
  }

  @Patch('invoices/:id')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInvoiceInput,
  ) {
    await this.requireRole(authorization, MANAGE_ROLES);
    return this.invoices.update(id, {
      invoiceNumber: body.invoiceNumber,
      status: body.status,
      link: body.link,
      issuedDate: body.issuedDate,
      note: typeof body.note === 'string' ? body.note : undefined,
    });
  }

  @Delete('invoices/:id')
  async remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.requireRole(authorization, MANAGE_ROLES);
    return this.invoices.remove(id);
  }

  @Get('invoices/:id/protocol')
  async protocol(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    await this.requireRole(authorization, STAFF_ROLES);
    const file = await this.invoices.protocol(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    file.stream.pipe(res);
  }

  private parseCreate(data: string): CreateProtocolInput {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data ?? '');
    } catch {
      throw new BadRequestException('Nieprawidłowe dane formularza');
    }
    const p = parsed as Partial<CreateProtocolInput>;
    const allocations = Array.isArray(p.allocations) ? p.allocations : [];
    const workIds = Array.isArray(p.workIds) ? p.workIds : [];
    const uuid = /^[0-9a-f-]{36}$/i;
    if (
      allocations.some((a) => !a || typeof a.milestoneId !== 'string' || !uuid.test(a.milestoneId) || typeof a.percent !== 'number') ||
      workIds.some((w) => typeof w !== 'string' || !uuid.test(w))
    ) {
      throw new BadRequestException('Nieprawidłowe dane formularza');
    }
    if (p.issuedDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.issuedDate)) {
      throw new BadRequestException('Data musi mieć format RRRR-MM-DD');
    }
    return {
      allocations,
      workIds,
      issuedDate: p.issuedDate || undefined,
      note: typeof p.note === 'string' ? p.note.slice(0, 2000) : undefined,
    };
  }

  private async requireRole(authorization: string | undefined, allowed: string[]): Promise<number> {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException();
    let userId: number | undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: number }>(token);
      userId = typeof payload.sub === 'number' ? payload.sub : undefined;
    } catch {
      throw new UnauthorizedException();
    }
    if (!userId) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
    const roles = (user?.roles ?? []).map((r) => r.toLowerCase());
    if (!roles.some((r) => allowed.includes(r))) throw new ForbiddenException('Brak uprawnień');
    return userId;
  }
}
