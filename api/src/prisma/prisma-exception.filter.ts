import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Turns expected database errors into proper HTTP answers instead of a 500 with a stack trace:
 * a missing record is 404, a duplicate is 409, a link to a missing or still-used record is 409.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const known: Record<string, [number, string]> = {
      P2025: [HttpStatus.NOT_FOUND, 'Nie znaleziono rekordu'],
      P2001: [HttpStatus.NOT_FOUND, 'Nie znaleziono rekordu'],
      P2002: [HttpStatus.CONFLICT, 'Taki rekord już istnieje'],
      P2003: [HttpStatus.CONFLICT, 'Rekord jest powiązany z innymi danymi'],
      P2014: [HttpStatus.CONFLICT, 'Rekord jest powiązany z innymi danymi'],
    };
    const match = known[error.code];
    if (!match) {
      this.logger.error(`Database error ${error.code}: ${error.message}`);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Błąd bazy danych' });
      return;
    }
    const [status, message] = match;
    this.logger.warn(`${error.code} on ${String(error.meta?.modelName ?? 'record')} → ${status}`);
    response.status(status).json({ statusCode: status, message });
  }
}
