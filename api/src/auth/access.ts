import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * Who may do what. Mirrors the rules of the web app, so the API refuses what the UI hides.
 * Admin (admin / administrator) passes every role check.
 */
export const Role = {
  Admin: 'admin',
  Administrator: 'administrator',
  OperationalDirector: 'operational_director',
  FinancialDirector: 'financial_director',
  ProjectManager: 'project_manager',
  Foreman: 'foreman',
  Viewer: 'viewer',
  Contractor: 'contractor',
} as const;

export const ADMIN_ROLES: string[] = [Role.Admin, Role.Administrator];

/** Internal staff: everyone except an external contractor */
export const STAFF_ROLES: string[] = [
  ...ADMIN_ROLES,
  Role.OperationalDirector,
  Role.FinancialDirector,
  Role.ProjectManager,
  Role.Foreman,
  Role.Viewer,
];

/** User attached to the request by the access guard */
export type AuthUser = {
  id: number;
  roles: string[];
  contractorId: string | null;
  /** Contractor account without any staff role: read-only access to its own projects */
  isContractorOnly: boolean;
  isAdmin: boolean;
  /** Which app issued the token: "erp" (e-mail sign-in) or "brigade" (brigade app, phone + Telegram) */
  audience: 'erp' | 'brigade';
};

/** Audience claim of tokens issued to the brigade app */
export const BRIGADE_AUDIENCE = 'brigade';

export const IS_PUBLIC = 'access:public';
export const ROLES = 'access:roles';
export const CONTRACTOR_ACCESS = 'access:contractor';
export const BRIGADE_ACCESS = 'access:brigade';

/** No login needed (sign-in, health check, integrations with their own API key) */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Endpoint of the brigade app: needs a brigade token (phone + Telegram sign-in).
 * ERP tokens are not accepted here, and brigade tokens are accepted nowhere else.
 */
export const BrigadeAccess = () => SetMetadata(BRIGADE_ACCESS, true);

/** Only these roles (admin always passes). Without it any logged-in staff member is allowed. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES, roles);

/**
 * How to find the project of a request, so a contractor can be limited to its own projects:
 * - `param:<name>` / `query:<name>`: route param or query value that is the project id
 * - `milestone:<param>` / `workType:<param>`: route param holding a milestone or work type id
 * - `scoped`: the handler filters the data itself (e.g. lists)
 */
export type ContractorScope =
  | 'scoped'
  | `param:${string}`
  | `query:${string}`
  | `milestone:${string}`
  | `workType:${string}`;

/** Contractors may call this (read-only) endpoint, limited to their own projects */
export const ContractorAccess = (scope: ContractorScope) => SetMetadata(CONTRACTOR_ACCESS, scope);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});

export function hasAnyRole(user: Pick<AuthUser, 'roles'>, roles: string[]): boolean {
  return user.roles.some((r) => roles.includes(r));
}
