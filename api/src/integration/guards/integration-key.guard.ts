import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';

/** Services that call ERP's integration API, each with its own key (so one can be rotated or revoked alone) */
const CLIENT_KEYS = {
  tma: 'INTEGRATION_API_KEY',
  stbr: 'ST_BR_API_KEY',
} as const;

export type IntegrationClient = keyof typeof CLIENT_KEYS;

const CLIENTS = 'integration:clients';

/** Which integration clients may call this endpoint (header `x-api-key`) */
export const IntegrationClients = (...clients: IntegrationClient[]) => SetMetadata(CLIENTS, clients);

function sameKey(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Checks the `x-api-key` header against the keys of the clients allowed by @IntegrationClients().
 * The matched client is put on the request as `integrationClient`.
 */
@Injectable()
export class IntegrationKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed =
      this.reflector.getAllAndOverride<IntegrationClient[] | undefined>(CLIENTS, [context.getHandler(), context.getClass()]) ?? [];
    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown>; integrationClient?: IntegrationClient }>();
    const header = request.headers['x-api-key'];
    const key = typeof header === 'string' ? header : '';

    const configured = allowed.flatMap((client) => {
      const value = this.config.get<string>(CLIENT_KEYS[client])?.trim();
      return value ? [{ client, value }] : [];
    });
    if (configured.length === 0) {
      throw new ServiceUnavailableException('Integration API key is not configured on the server');
    }

    const match = key ? configured.find((c) => sameKey(key, c.value)) : undefined;
    if (!match) throw new UnauthorizedException('Invalid or missing x-api-key header');
    request.integrationClient = match.client;
    return true;
  }
}
