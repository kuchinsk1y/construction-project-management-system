import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ContractorAccess, CurrentUser, Role, Roles, type AuthUser } from '../auth/access';
import { InvoicesService, type CreateProtocolInput, type UpdateInvoiceInput } from './invoices.service';

const PAID_STATUSES = ['ZAPŁACONE', 'ZAPŁACONA'];

@Controller()
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  /** Shown in the milestones tab, also to the project's contractor */
  @ContractorAccess('param:projectId')
  @Get('projects/:projectId/invoices')
  list(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.invoices.list(projectId);
  }

  /** Closes works with an acceptance protocol: multipart with `protocol` (file) and `data` (JSON) */
  /** Who may request invoices by closing works */
  @Roles(Role.OperationalDirector, Role.ProjectManager)
  @Post('projects/:projectId/invoices')
  @UseInterceptors(FileInterceptor('protocol', { limits: { fileSize: 25 * 1024 * 1024 } }))
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body('data') data: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.invoices.create(projectId, user.id, this.parseCreate(data), file);
  }

  /** Finance manages invoices: number, Fakturownia link, status, payment */
  @Roles(Role.FinancialDirector)
  @Patch('invoices/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInvoiceInput,
  ) {
    await this.guardPaid(id, user);
    return this.invoices.update(id, {
      invoiceNumber: body.invoiceNumber,
      status: body.status,
      link: body.link,
      issuedDate: body.issuedDate,
      note: typeof body.note === 'string' ? body.note : undefined,
    });
  }

  @Roles(Role.FinancialDirector)
  @Delete('invoices/:id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.guardPaid(id, user);
    return this.invoices.remove(id);
  }

  @Get('invoices/:id/protocol')
  async protocol(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
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

  /** A paid invoice is final: only an admin may still change or delete it */
  private async guardPaid(id: string, user: AuthUser) {
    const invoice = await this.invoices.get(id);
    if (PAID_STATUSES.includes(invoice.status) && !user.isAdmin) {
      throw new ForbiddenException('Zapłaconą fakturę może zmienić tylko administrator');
    }
  }
}
