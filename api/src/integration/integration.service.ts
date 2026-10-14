import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  fieldGroups,
  parseProjectFields,
  pickFields,
  ProjectFieldGroup,
} from './project-fields';

export type ListProjectsQuery = {
  status?: string;
  managerId?: string;
  fields?: string;
};

@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  // Loads only the relations required by the requested fields.
  private buildInclude(groups: Set<ProjectFieldGroup>): Prisma.projectsInclude {
    const include: Prisma.projectsInclude = {};

    if (groups.has('contractor')) {
      include.contractors = { select: { id: true, name: true } };
    }
    if (groups.has('type')) {
      include.project_types = { select: { code: true, name: true } };
    }
    if (groups.has('manager')) {
      include.users_projects_manager_idTousers = {
        select: { id: true, firstName: true, lastName: true, email: true },
      };
    }
    if (groups.has('milestones')) {
      include.milestones = {
        where: { deleted_at: null },
        orderBy: { milestone_no: 'asc' },
      };
    }
    if (groups.has('works')) {
      include.project_work_types = {
        where: { deleted_at: null },
        include: { departments: true, milestones: true },
        orderBy: { created_at: 'asc' },
      };
    }
    if (groups.has('plannedExpenses')) {
      include.planned_expenses = {
        include: { cost_categories: true },
        orderBy: { planned_date: 'asc' },
      };
    }
    if (groups.has('departments')) {
      include.project_department_foremen = {
        include: { departments: true, users: true },
      };
    }

    return include;
  }

  private parseManagerId(raw?: string): number | undefined {
    if (raw === undefined) return undefined;

    const value = Number(raw);
    if (!/^\d+$/.test(raw.trim()) || !Number.isSafeInteger(value)) {
      throw new BadRequestException(
        'Query parameter "managerId" must be a positive integer',
      );
    }
    return value;
  }

  async listActiveProjects(query: ListProjectsQuery = {}) {
    const fields = parseProjectFields(query.fields);
    const managerId = this.parseManagerId(query.managerId);
    const status = query.status?.trim();

    const where: Prisma.projectsWhereInput = { deleted_at: null };
    if (status) {
      where.status = { equals: status, mode: 'insensitive' };
    }
    if (managerId !== undefined) {
      where.manager_id = managerId;
    }

    const projects = await this.prisma.projects.findMany({
      where,
      include: this.buildInclude(fieldGroups(fields)),
      orderBy: { created_at: 'desc' },
    });

    return projects.map((p) => this.toView(p, fields));
  }

  async getProjectDetails(id: string, rawFields?: string) {
    const fields = parseProjectFields(rawFields);

    const project = await this.prisma.projects.findUnique({
      where: { id, deleted_at: null },
      include: this.buildInclude(fieldGroups(fields)),
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.toView(project, fields);
  }

  private toView(project: any, fields?: string[]) {
    const view = this.mapDetailedProject(project);
    return fields ? pickFields(view, fields) : view;
  }

  private mapDetailedProject(project: any) {
    const basic = this.mapBasicProject(project);

    return {
      ...basic,
      milestones: (project.milestones || []).map(m => ({
        id: m.id,
        milestoneNo: m.milestone_no,
        type: m.type,
        description: m.description,
        percentage: m.percentage ? Number(m.percentage) : 0,
        netAmount: m.net_amount ? Number(m.net_amount) : 0,
        invoicingPercentage: m.invoicing_percentage ? Number(m.invoicing_percentage) : null,
      })),
      
      works: (project.project_work_types || []).map(w => ({
        id: w.id,
        department: w.departments?.name ?? '',
        milestoneNo: w.milestones?.milestone_no ?? '',
        name: w.name,
        unit: w.unit,
        totalQuantity: w.total_quantity ? Number(w.total_quantity) : 0,
        percentage: w.percentage ? Number(w.percentage) : 0,
        plannedStart: w.planned_start ? w.planned_start.toISOString().split('T')[0] : null,
        plannedEnd: w.planned_end ? w.planned_end.toISOString().split('T')[0] : null,
      })),

      plannedExpenses: (project.planned_expenses || []).map(e => ({
        id: e.id,
        categoryName: e.cost_categories?.name ?? '',
        plannedPercent: e.planned_percent ? Number(e.planned_percent) : 0,
        plannedDate: e.planned_date ? e.planned_date.toISOString().split('T')[0] : null,
      })),

      departments: (project.project_department_foremen || []).map(df => ({
        departmentName: df.departments?.name ?? '',
        foreman: {
          firstName: df.users?.firstName ?? '',
          lastName: df.users?.lastName ?? ''
        }
      }))
    };
  }

  private mapBasicProject(p: any) {
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      type: p.project_types?.code,
      location: {
        country: p.country,
        city: p.city,
        latitude: p.latitude != null ? Number(p.latitude) : null,
        longitude: p.longitude != null ? Number(p.longitude) : null,
      },
      dates: {
        contractStart: p.start_date_contract ? p.start_date_contract.toISOString().split('T')[0] : null,
        contractEnd: p.end_date_contract ? p.end_date_contract.toISOString().split('T')[0] : null,
        factStart: p.start_date_fact ? p.start_date_fact.toISOString().split('T')[0] : null,
        factEnd: p.end_date_fact ? p.end_date_fact.toISOString().split('T')[0] : null,
      },
      financials: {
        netValue: p.contract_net_value ? Number(p.contract_net_value) : null,
        currency: p.currency
      },
      contractor: p.contractors ? {
        id: p.contractors.id,
        name: p.contractors.name
      } : null,
      manager: p.users_projects_manager_idTousers ? {
        id: p.users_projects_manager_idTousers.id,
        firstName: p.users_projects_manager_idTousers.firstName,
        lastName: p.users_projects_manager_idTousers.lastName,
        email: p.users_projects_manager_idTousers.email
      } : null,
      power: p.power ? Number(p.power) : null,
    };
  }
}
