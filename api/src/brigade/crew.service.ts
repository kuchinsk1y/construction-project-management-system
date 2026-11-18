import { ForbiddenException, Injectable } from '@nestjs/common';
import type { BrigadeForeman } from '../auth/access';
import { TmaBrigadeClient } from './tma/tma-brigade.client';
import type { TmaAbsenceType } from './tma/tma-brigade.types';

/** A person of the foreman's crew (from TMA) */
export type CrewWorker = {
  /** Worker id in TMA */
  key: string;
  id: string;
  /** "Nowak Adam" */
  name: string;
  company: string;
  position: string;
  /** Hourly rate («indeks»); null when TMA has none */
  rate: number | null;
  /** ERP project where he works now (TMA), only when it is one of the foreman's projects */
  projectId: string | null;
};

export type ForemanData = { crew: CrewWorker[]; projectIds: string[] };

/**
 * Crew and projects of the signed-in foreman, as TMA gives them (cached for a minute in the TMA client),
 * and absences of the crew for a day.
 */
@Injectable()
export class CrewService {
  constructor(private readonly tma: TmaBrigadeClient) {}

  async get(foreman: BrigadeForeman, fresh = false): Promise<ForemanData> {
    const card = await this.tma.foremanByPhone(foreman.phone, fresh);
    // TMA no longer lists this number as the same foreman: the session must not keep working
    if (!card || card.foreman.id !== foreman.id) throw new ForbiddenException('Ten numer nie należy już do brygadzisty');
    const ownProjects = new Set(card.projectIds);
    return {
      crew: card.crew
        .map((w) => ({
          key: w.id,
          id: w.id,
          name: [w.lastName, w.firstName].filter(Boolean).join(' ') || '—',
          company: w.company,
          position: w.position,
          rate: w.rate,
          projectId: w.projectId && ownProjects.has(w.projectId) ? w.projectId : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
      projectIds: card.projectIds,
    };
  }

  /** Worker id → absence on the date (when TMA gives several, the most serious one wins) */
  async absencesOn(foreman: BrigadeForeman, date: string): Promise<Map<string, TmaAbsenceType>> {
    const order: TmaAbsenceType[] = ['dismissed', 'drunk_on_site', 'drunk', 'absence', 'sick', 'vacation', 'day_off'];
    const result = new Map<string, TmaAbsenceType>();
    for (const a of await this.tma.absences(foreman.id, date, date)) {
      const current = result.get(a.workerId);
      if (!current || order.indexOf(a.type) < order.indexOf(current)) result.set(a.workerId, a.type);
    }
    return result;
  }
}
