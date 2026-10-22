import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS_IN_CHART = 8;
const PAID_STATUSES = ['ZAPŁACONE', 'ZAPŁACONA'];
const DONE_PROJECT_STATUSES = ['COMPLETED', 'DONE', 'ARCHIVED'];

type ProjectState = 'active' | 'planning' | 'blocked' | 'done';

function projectState(raw: string): ProjectState {
  const s = raw.toUpperCase();
  if (s === 'ACTIVE') return 'active';
  if (s === 'ON_HOLD') return 'blocked';
  if (DONE_PROJECT_STATUSES.includes(s)) return 'done';
  return 'planning';
}

function isoDate(date: Date | null | undefined): string | null {
  return date ? date.toISOString().split('T')[0] : null;
}

/** Monday 00:00 UTC of the week containing `date` */
function weekStart(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d;
}

function isoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Everything the Pulpit page shows, in one round trip. */
  async getSummary(requesterId: number | null) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Contractors only see their own projects (same rule as the projects list)
    let contractorId: string | null = null;
    if (requesterId) {
      const user = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { roles: true, contractor_id: true },
      });
      const roles = (user?.roles ?? []).map((r) => r.toLowerCase());
      const isStaff = roles.some((r) =>
        [
          'admin',
          'administrator',
          'operational_director',
          'financial_director',
          'project_manager',
        ].includes(r),
      );
      if (roles.includes('contractor') && !isStaff)
        contractorId = user?.contractor_id ?? '__none__';
    }

    const projects = await this.prisma.projects.findMany({
      where: {
        deleted_at: null,
        ...(contractorId ? { contractor_id: contractorId } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        currency: true,
        payment_term_days: true,
        end_date_contract: true,
        end_date_fact: true,
        contractors: { select: { name: true } },
      },
    });
    const projectIds = projects.map((p) => p.id);
    const projectById = new Map(projects.map((p) => [p.id, p]));

    const [works, invoices, weekReports, recentReports, milestoneTotals] =
      await Promise.all([
        this.prisma.project_work_types.findMany({
          where: { project_id: { in: projectIds }, deleted_at: null },
          select: {
            id: true,
            project_id: true,
            name: true,
            unit: true,
            percentage: true,
            total_quantity: true,
            planned_start: true,
            planned_end: true,
            milestones: {
              select: {
                milestone_no: true,
                type: true,
                percentage: true,
                deleted_at: true,
              },
            },
            daily_reports: {
              where: { deleted_at: null },
              select: { actual_quantity: true },
            },
          },
        }),
        this.prisma.milestones_invoices.findMany({
          where: {
            milestones: { project_id: { in: projectIds }, deleted_at: null },
          },
          select: {
            id: true,
            invoice_number: true,
            net_value: true,
            status: true,
            issued_date: true,
            paid_at: true,
            milestones: { select: { project_id: true, milestone_no: true } },
          },
        }),
        this.prisma.daily_reports.findMany({
          where: {
            project_id: { in: projectIds },
            deleted_at: null,
            report_date: {
              gte: new Date(
                weekStart(today).getTime() - (WEEKS_IN_CHART - 1) * 7 * DAY_MS,
              ),
            },
          },
          select: { report_date: true, actual_hours: true },
        }),
        this.prisma.daily_reports.findMany({
          where: { project_id: { in: projectIds }, deleted_at: null },
          orderBy: [{ report_date: 'desc' }, { id: 'desc' }],
          take: 6,
          select: {
            id: true,
            report_date: true,
            actual_quantity: true,
            actual_workers: true,
            actual_hours: true,
            project_id: true,
            project_work_types: {
              select: {
                id: true,
                name: true,
                unit: true,
                departments: { select: { name: true } },
              },
            },
          },
        }),
        this.prisma.milestones.aggregate({
          where: { project_id: { in: projectIds }, deleted_at: null },
          _sum: { net_amount: true },
        }),
      ]);

    // ── Works: progress per work and per project ─────────────────────────────
    const workRows = works
      .filter((w) => !w.milestones || w.milestones.deleted_at === null)
      .map((w) => {
        const total = Number(w.total_quantity ?? 0);
        const actual = w.daily_reports.reduce(
          (sum, r) => sum + Number(r.actual_quantity ?? 0),
          0,
        );
        const ratio = total > 0 ? Math.min(1, actual / total) : 0;
        const plannedEnd = w.planned_end;
        const finished = total > 0 && actual >= total;
        return {
          ...w,
          total,
          actual,
          ratio,
          finished,
          started: actual > 0,
          late: Boolean(plannedEnd && plannedEnd < today && !finished),
        };
      });

    const progressByProject = new Map<string, number>();
    const lateByProject = new Map<string, number>();
    for (const projectId of projectIds) {
      // Contract milestones (KM) weighted by their share; additional works don't move progress
      const km = workRows.filter(
        (w) =>
          w.project_id === projectId &&
          w.milestones?.type !== 'roboty_dodatkowe',
      );
      if (km.length > 0) {
        const byMilestone = new Map<string, { share: number; done: number }>();
        for (const w of km) {
          const key = w.milestones?.milestone_no ?? '—';
          const entry = byMilestone.get(key) ?? {
            share: Number(w.milestones?.percentage ?? 0),
            done: 0,
          };
          entry.done += (Number(w.percentage ?? 100) / 100) * w.ratio;
          byMilestone.set(key, entry);
        }
        const totalShare = [...byMilestone.values()].reduce(
          (sum, m) => sum + m.share,
          0,
        );
        const progress =
          totalShare > 0
            ? [...byMilestone.values()].reduce(
                (sum, m) => sum + m.share * Math.min(1, m.done),
                0,
              ) / totalShare
            : 0;
        progressByProject.set(projectId, Math.round(progress * 100));
      }
      lateByProject.set(
        projectId,
        workRows.filter((w) => w.project_id === projectId && w.late).length,
      );
    }

    // ── Invoices ─────────────────────────────────────────────────────────────
    const invoiceBuckets = {
      paid: { count: 0, net: 0 },
      issued: { count: 0, net: 0 },
      requested: { count: 0, net: 0 },
      overdue: { count: 0, net: 0 },
    };
    const attention: Array<{
      id: string;
      number: string | null;
      projectId: string;
      projectName: string;
      milestoneNo: string;
      net: number;
      currency: string;
      kind: 'overdue' | 'due_soon' | 'request';
      days: number;
    }> = [];

    for (const inv of invoices) {
      const project = projectById.get(inv.milestones.project_id);
      if (!project) continue;
      const net = Number(inv.net_value);
      const status = (inv.status || 'OCZEKUJE').toUpperCase();
      const base = {
        id: inv.id,
        number: inv.invoice_number,
        projectId: project.id,
        projectName: project.name,
        milestoneNo: inv.milestones.milestone_no,
        net,
        currency: project.currency || 'PLN',
      };

      if (PAID_STATUSES.includes(status)) {
        invoiceBuckets.paid.count += 1;
        invoiceBuckets.paid.net += net;
      } else if (status === 'WYSTAWIONA') {
        const due = inv.issued_date
          ? new Date(
              inv.issued_date.getTime() +
                (project.payment_term_days ?? 30) * DAY_MS,
            )
          : null;
        const daysToDue = due
          ? Math.round((due.getTime() - today.getTime()) / DAY_MS)
          : null;
        if (daysToDue !== null && daysToDue < 0) {
          invoiceBuckets.overdue.count += 1;
          invoiceBuckets.overdue.net += net;
          attention.push({ ...base, kind: 'overdue', days: -daysToDue });
        } else {
          invoiceBuckets.issued.count += 1;
          invoiceBuckets.issued.net += net;
          if (daysToDue !== null && daysToDue <= 7)
            attention.push({ ...base, kind: 'due_soon', days: daysToDue });
        }
      } else {
        invoiceBuckets.requested.count += 1;
        invoiceBuckets.requested.net += net;
        attention.push({ ...base, kind: 'request', days: 0 });
      }
    }
    const attentionOrder = { overdue: 0, due_soon: 1, request: 2 };
    attention.sort(
      (a, b) =>
        attentionOrder[a.kind] - attentionOrder[b.kind] || b.days - a.days,
    );

    // ── Settlement by invoice status (same rules as the milestone invoices view):
    // paid = ZAPŁACONE, issued = WYSTAWIONA, requests (OCZEKUJE) still count as remaining
    const settlementTotal = Number(milestoneTotals._sum.net_amount ?? 0);
    const paidNet = Math.min(settlementTotal, invoiceBuckets.paid.net);
    const issuedNet = Math.min(
      settlementTotal - paidNet,
      invoiceBuckets.issued.net + invoiceBuckets.overdue.net,
    );
    const settlement = {
      total: settlementTotal,
      paid: paidNet,
      invoicedNotPaid: issuedNet,
      remaining: Math.max(0, settlementTotal - paidNet - issuedNet),
    };

    // ── Hours per week ───────────────────────────────────────────────────────
    const currentWeek = weekStart(today);
    const hoursByWeek = Array.from({ length: WEEKS_IN_CHART }, (_, i) => {
      const start = new Date(
        currentWeek.getTime() - (WEEKS_IN_CHART - 1 - i) * 7 * DAY_MS,
      );
      return {
        weekStart: isoDate(start)!,
        label: `T${isoWeekNumber(start)}`,
        hours: 0,
        isCurrent: i === WEEKS_IN_CHART - 1,
      };
    });
    for (const r of weekReports) {
      const key = isoDate(weekStart(r.report_date));
      const bucket = hoursByWeek.find((w) => w.weekStart === key);
      if (bucket) bucket.hours += Number(r.actual_hours ?? 0);
    }

    // ── Assemble ─────────────────────────────────────────────────────────────
    const stateRank: Record<ProjectState, number> = {
      active: 0,
      blocked: 1,
      planning: 2,
      done: 3,
    };
    const projectRows = projects
      .map((p) => ({
        id: p.id,
        name: p.name,
        contractor: p.contractors?.name ?? null,
        status: projectState(p.status),
        progress: progressByProject.get(p.id) ?? null,
        lateWorks: lateByProject.get(p.id) ?? 0,
        endDate: isoDate(p.end_date_fact ?? p.end_date_contract),
      }))
      .sort(
        (a, b) =>
          stateRank[a.status] - stateRank[b.status] ||
          (a.endDate ?? '9999').localeCompare(b.endDate ?? '9999'),
      );

    const upcoming = workRows
      .filter((w) => !w.finished && w.planned_end && w.planned_end >= today)
      .sort((a, b) => a.planned_end!.getTime() - b.planned_end!.getTime())
      .slice(0, 5)
      .map((w) => ({
        workId: w.id,
        projectId: w.project_id,
        projectName: projectById.get(w.project_id)?.name ?? '',
        name: w.name,
        milestoneNo: w.milestones?.milestone_no ?? null,
        plannedEnd: isoDate(w.planned_end),
        progress: Math.round(w.ratio * 100),
        started: w.started,
      }));

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        totalProjects: projects.length,
        activeProjects: projectRows.filter((p) => p.status === 'active').length,
        blockedProjects: projectRows.filter((p) => p.status === 'blocked')
          .length,
        worksInProgress: workRows.filter((w) => w.started && !w.finished)
          .length,
        worksLate: workRows.filter((w) => w.late).length,
        invoiceRequests: invoiceBuckets.requested.count,
        invoiceRequestsNet: invoiceBuckets.requested.net,
        hoursThisWeek: hoursByWeek[WEEKS_IN_CHART - 1].hours,
        hoursLastWeek: hoursByWeek[WEEKS_IN_CHART - 2].hours,
      },
      projects: projectRows.slice(0, 6),
      // Progress of every project (used by the projects Gantt)
      projectProgress: Object.fromEntries(
        projectIds.map((id) => [id, progressByProject.get(id) ?? null]),
      ),
      invoices: { ...invoiceBuckets, attention: attention.slice(0, 4) },
      settlement,
      hoursByWeek,
      upcoming,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        date: isoDate(r.report_date),
        projectId: r.project_id,
        projectName: projectById.get(r.project_id)?.name ?? '',
        workId: r.project_work_types.id,
        workName: r.project_work_types.name,
        department: r.project_work_types.departments?.name ?? null,
        unit: r.project_work_types.unit,
        quantity: Number(r.actual_quantity ?? 0),
        workers: r.actual_workers,
        hours: r.actual_hours !== null ? Number(r.actual_hours) : null,
      })),
    };
  }
}
