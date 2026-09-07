import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  private get detailedIncludes() {
    return {
      contractors: { select: { id: true, name: true } },
      project_types: { select: { code: true, name: true } },
      users_projects_manager_idTousers: { select: { id: true, firstName: true, lastName: true, email: true } },
      
      milestones: {
        where: { deleted_at: null },
        orderBy: { milestone_no: 'asc' } as any,
      },
      
      project_work_types: {
        where: { deleted_at: null },
        include: { departments: true, milestones: true },
        orderBy: { created_at: 'asc' } as any,
      },
      
      planned_expenses: {
        include: { cost_categories: true },
        orderBy: { planned_date: 'asc' } as any,
      },

      project_department_foremen: {
        include: { departments: true, users: true }
      }
    };
  }

  async listActiveProjects() {
    const projects = await this.prisma.projects.findMany({
      where: { 
        deleted_at: null,
      },
      include: this.detailedIncludes,
      orderBy: { created_at: 'desc' },
    });

    return projects.map(p => this.mapDetailedProject(p));
  }

  async getProjectDetails(id: string) {
    const project = await this.prisma.projects.findUnique({
      where: { id, deleted_at: null },
      include: this.detailedIncludes
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.mapDetailedProject(project);
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
        city: p.city
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
