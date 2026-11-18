/**
 * What ERP gets from TMA about a foreman. Foremen and workers live in TMA, not in ERP users.
 *
 * 1) Sign-in and crew:
 *    GET {TMA_API_URL}{TMA_FOREMAN_CHECK_PATH}?phone=+48123456789      header x-api-key: TMA_API_KEY
 *    200 → TmaForemanCard (isForeman: true), 404 → not a foreman
 *
 * 2) Absences of the crew for a period:
 *    GET {TMA_API_URL}{TMA_FOREMAN_ABSENCES_PATH with :id}?dateFrom=2026-11-01&dateTo=2026-11-30
 *    200 → { "absences": TmaAbsence[] }
 *
 * 3) Days the foreman may fill in, within a period:
 *    GET {TMA_API_URL}{TMA_FOREMAN_OPEN_DAYS_PATH with :id}?dateFrom=2026-11-01&dateTo=2026-11-30
 *    200 → { "openDays": ["2026-11-10", "2026-11-11"] }   — every other day of the period is closed
 *
 * 4) QR check-ins of the crew on one day (who started work on which project):
 *    GET {TMA_API_URL}{TMA_FOREMAN_CHECK_INS_PATH with :id}?date=2026-11-16
 *    200 → TmaCheckInsDay   — people without a check-in that day are simply not in the list
 *
 * Mock answers in the same format: api/src/brigade/tma/mock/*.json
 */

export type TmaForeman = {
  /** Foreman id in TMA (string: TMA decides the format) */
  id: string;
  firstName: string;
  lastName: string;
  /** "+48123456789" */
  phone: string;
  /** Where the sign-in code is sent; null = no Telegram linked */
  telegramId: string | null;
};

export type TmaWorker = {
  /** Worker id in TMA */
  id: string;
  firstName: string;
  lastName: string;
  /** Employer: "ISPIK", "ISPIK Latvia", agency name… */
  company: string;
  position: string;
  /** Hourly rate (PLN); null when not known (e.g. agency workers) */
  rate: number | null;
  /** ERP project id (projects.id) where he works now; the form opens with it chosen. null = not known */
  projectId: string | null;
};

export type TmaForemanCard = {
  isForeman: true;
  foreman: TmaForeman;
  /** People of his crew today */
  crew: TmaWorker[];
  /** ERP project ids (projects.id) where he works; TMA gets projects from ERP */
  projectIds: string[];
};

/**
 * Why a person did not work that day (TMA decides, the form shows no card for him):
 * vacation — urlop, sick — chory, day_off — wolne, absence — absencja (nieusprawiedliwiona),
 * drunk — pijaństwo, drunk_on_site — pijaństwo na budowie, dismissed — zwolniony
 */
export type TmaAbsenceType = 'vacation' | 'sick' | 'day_off' | 'absence' | 'drunk' | 'drunk_on_site' | 'dismissed';

export type TmaAbsence = {
  workerId: string;
  type: TmaAbsenceType;
  /** Inclusive; for "dismissed" both are the dismissal day */
  dateFrom: string;
  dateTo: string;
};

/** Status of a work day in TMA (same values as the live attendance of a project) */
export type TmaCheckInStatus = 'open' | 'close_requested' | 'closed' | 'auto_closed';

export type TmaCheckIn = {
  /** Id (uuid) of the TMA work day event; saved with the hours as work_hours.work_day_event_id */
  id: string;
  workerId: string;
  /** ERP project id where he checked in */
  projectId: string;
  status: TmaCheckInStatus;
  /** ISO time of the check-in */
  checkInAt: string;
  checkInMethod: 'qr' | 'manual' | 'self';
  /** ISO time the day was closed; null while open */
  closedAt: string | null;
  /** ERP work type (project_work_types.id) the worker chose in TMA; null = not chosen. The form starts with it. */
  workTypeId: string | null;
  /** What the worker wrote about his day in TMA; goes to «Uwagi» */
  workDescription: string | null;
};

export type TmaCheckInsDay = {
  date: string;
  generatedAt: string;
  checkIns: TmaCheckIn[];
};
