import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import {
  ADMIN_ROLES,
  AuthUser,
  CONTRACTOR_ACCESS,
  ContractorScope,
  hasAnyRole,
  IS_PUBLIC,
  Role,
  ROLES,
  STAFF_ROLES,
} from './access';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type HttpRequest = {
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
  query: Record<string, unknown>;
  user?: AuthUser;
};

/**
 * Global guard: every endpoint needs a valid access token of an active user, unless marked @Public().
 * Then @Roles() limits the roles, and contractors only reach endpoints marked @ContractorAccess()
 * for projects of their own company.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const user = await this.authenticate(request);
    request.user = user;

    if (user.isContractorOnly) {
      const scope = this.reflector.getAllAndOverride<ContractorScope | undefined>(CONTRACTOR_ACCESS, targets);
      if (!scope) throw new ForbiddenException('Brak uprawnień');
      await this.assertOwnProject(user, scope, request.params, request.query);
      return true;
    }

    if (!hasAnyRole(user, STAFF_ROLES)) throw new ForbiddenException('Brak uprawnień');

    const roles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES, targets);
    if (roles?.length && !user.isAdmin && !hasAnyRole(user, roles)) {
      throw new ForbiddenException('Brak uprawnień do tej operacji');
    }
    return true;
  }

  private async authenticate(request: HttpRequest): Promise<AuthUser> {
    const header = request.headers.authorization;
    const token = (Array.isArray(header) ? header[0] : header)?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException();

    let userId: number | undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: number }>(token);
      userId = typeof payload.sub === 'number' ? payload.sub : undefined;
    } catch {
      throw new UnauthorizedException();
    }
    if (!userId) throw new UnauthorizedException();

    // Roles and status come from the database, so a change or deactivation applies right away
    const record = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: true, isActive: true, contractor_id: true },
    });
    if (!record || !record.isActive) throw new UnauthorizedException();

    const roles = (record.roles ?? []).map((r) => r.toLowerCase());
    const isStaff = hasAnyRole({ roles }, STAFF_ROLES);
    return {
      id: record.id,
      roles,
      contractorId: record.contractor_id,
      isContractorOnly: roles.includes(Role.Contractor) && !isStaff,
      isAdmin: hasAnyRole({ roles }, ADMIN_ROLES),
    };
  }

  /** A contractor sees only projects of its own company */
  private async assertOwnProject(
    user: AuthUser,
    scope: ContractorScope,
    params: Record<string, string>,
    query: Record<string, unknown>,
  ) {
    if (scope === 'scoped') return;
    if (!user.contractorId) throw new ForbiddenException('Brak uprawnień');

    const [kind, name] = scope.split(':') as ['param' | 'query' | 'milestone' | 'workType', string];
    const raw = kind === 'query' ? query[name] : params[name];
    const value = typeof raw === 'string' ? raw : '';
    if (!UUID.test(value)) throw new ForbiddenException('Brak uprawnień');

    let projectId: string | null = null;
    if (kind === 'param' || kind === 'query') projectId = value;
    if (kind === 'milestone') {
      projectId = (await this.prisma.milestones.findUnique({ where: { id: value }, select: { project_id: true } }))?.project_id ?? null;
    }
    if (kind === 'workType') {
      projectId =
        (await this.prisma.project_work_types.findUnique({ where: { id: value }, select: { project_id: true } }))?.project_id ?? null;
    }
    if (!projectId) throw new ForbiddenException('Brak uprawnień');

    const project = await this.prisma.projects.findUnique({
      where: { id: projectId },
      select: { contractor_id: true, deleted_at: true },
    });
    if (!project || project.deleted_at || project.contractor_id !== user.contractorId) {
      throw new ForbiddenException('Brak uprawnień');
    }
  }
}
