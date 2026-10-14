import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const usersToSeed = [
  {
    email: 'tymur.kuchynskyi@ispik.eu',
    firstName: 'Tymur',
    lastName: 'Kuchynskyi',
    middleNames: '',
    position: 'Administrator',
    phoneNumber: '+48787368874',
    telegramId: 784892922n,
    roles: ['admin'],
    isActive: true,
  },
  {
    email: 'vitalii.vykhrystiuk@ispik.eu',
    firstName: 'Vitalii',
    lastName: 'Vykhrystiuk',
    middleNames: '',
    position: 'Kierownik działu IT',
    phoneNumber: '+48575503390',
    telegramId: 1645624128n,
    roles: ['admin'],
    isActive: true,
  },
  // --- Project Manager ---
  {
    email: 'anna.nowakowska@ispik.eu',
    firstName: 'Anna',
    lastName: 'Nowakowska',
    middleNames: null,
    position: 'Kierownik Projektu',
    phoneNumber: '+48999888777',
    telegramId: null,
    roles: ['project_manager'],
    isActive: true,
  },
  // --- Foremen (St. Brygadziści) ---
  {
    email: 'jan.kowalski@ispik.eu',
    firstName: 'Jan',
    lastName: 'Kowalski',
    middleNames: null,
    position: 'St. Brygadzista (Kafar)',
    phoneNumber: '+48111222333',
    telegramId: null,
    roles: ['foreman'],
    isActive: true,
  },
  {
    email: 'piotr.nowak@ispik.eu',
    firstName: 'Piotr',
    lastName: 'Nowak',
    middleNames: null,
    position: 'St. Brygadzista (Montaż)',
    phoneNumber: '+48222333444',
    telegramId: null,
    roles: ['foreman'],
    isActive: true,
  },
  {
    email: 'adam.wisniewski@ispik.eu',
    firstName: 'Adam',
    lastName: 'Wiśniewski',
    middleNames: null,
    position: 'St. Brygadzista (Elektryka)',
    phoneNumber: '+48333444555',
    telegramId: null,
    roles: ['foreman'],
    isActive: true,
  },
  {
    email: 'marek.wojcik@ispik.eu',
    firstName: 'Marek',
    lastName: 'Wójcik',
    middleNames: null,
    position: 'St. Brygadzista (Kable AC)',
    phoneNumber: '+48444555666',
    telegramId: null,
    roles: ['foreman'],
    isActive: true,
  },
  // --- Additional Roles ---
  {
    email: 'test1@ispik.eu',
    firstName: 'Yevhenii',
    lastName: 'Kobets',
    middleNames: null,
    position: 'Wiceprezes zarządu',
    phoneNumber: '1481165954',
    telegramId: 1481165954n,
    roles: ['operational_director'],
    isActive: true,
  },
  {
    email: 'kasia.finanse@ispik.eu',
    firstName: 'Katarzyna',
    lastName: 'Finansowa',
    middleNames: null,
    position: 'Dyrektor Finansowy',
    phoneNumber: '+48555444333',
    telegramId: null,
    roles: ['financial_director'],
    isActive: true,
  },
  {
    email: 'jan.wykonawca@ispik.eu',
    firstName: 'Jan',
    lastName: 'Wykonawczy',
    middleNames: null,
    position: 'Przedstawiciel Wykonawcy',
    phoneNumber: '+48444333222',
    telegramId: null,
    roles: ['contractor'],
    isActive: true,
  },
];

const departmentsToSeed = [
  { name: 'Kafar', icon: 'Hammer' },
  { name: 'Montaż', icon: 'Wrench' },
  { name: 'Elektryka', icon: 'Zap' },
  { name: 'Kable AC', icon: 'Cable' },
];

// Deterministic pseudo-random generator so every seed run gives the same reports
function seededRandom(seedText: string): () => number {
  let state = 0;
  for (const char of seedText) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

type SeedDailyReport = {
  date: Date;
  quantity: number;
  workers: number;
  hours: number;
};

/** Typical crew size per department (people on site per day) */
const CREW_BY_DEPARTMENT: Record<string, [number, number]> = {
  Kafar: [3, 5],
  Montaż: [6, 12],
  Elektryka: [4, 8],
  'Kable AC': [4, 7],
};

type SeedWorkSchedule = {
  name: string;
  dept: string;
  start: string;
  end: string;
  actual: number;
  isFinished: boolean;
};

/**
 * Spreads `actual` over working days from `start` until `end` (or yesterday for unfinished
 * work — also past the planned end when the work is late). Sundays off, Saturdays only
 * sometimes and shorter, occasional lost days (weather, deliveries), slow first day.
 */
function buildDailyReports(work: SeedWorkSchedule): SeedDailyReport[] {
  const random = seededRandom(work.name);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const from = new Date(`${work.start}T00:00:00Z`);
  const planEnd = new Date(`${work.end}T00:00:00Z`);
  const to = work.isFinished ? planEnd : yesterday;
  if (work.actual <= 0 || from > to) return [];

  const days: { date: Date; isSaturday: boolean }[] = [];
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow === 0) continue;
    if (dow === 6 && random() < 0.55) continue; // most Saturdays off
    if (d > from && random() < 0.07) continue; // rain / waiting for material
    days.push({ date: new Date(d), isSaturday: dow === 6 });
  }
  if (days.length === 0) days.push({ date: from, isSaturday: false });

  const [crewMin, crewMax] = CREW_BY_DEPARTMENT[work.dept] ?? [4, 8];
  const crews = days.map(({ isSaturday }, i) => {
    const base = crewMin + Math.round(random() * (crewMax - crewMin));
    const crew = i === 0 ? Math.max(crewMin, base - 2) : base;
    return isSaturday ? Math.max(2, Math.round(crew * 0.6)) : crew;
  });
  const shiftHours = days.map(({ isSaturday }) => (isSaturday ? 6 : 8 + Math.round(random() * 2)));

  // Output follows man-hours with ±20% productivity noise
  const weights = crews.map((crew, i) => crew * shiftHours[i] * (0.8 + random() * 0.4));
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  // Whole units per day (largest remainder method keeps the exact total)
  const exact = weights.map((w) => (work.actual * w) / weightSum);
  const quantities = exact.map((q) => Math.floor(q));
  let rest = Math.round(work.actual) - quantities.reduce((sum, q) => sum + q, 0);
  exact
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (rest > 0) {
        quantities[i] += 1;
        rest -= 1;
      }
    });

  return days
    .map(({ date }, i) => ({
      date,
      quantity: quantities[i],
      workers: crews[i],
      hours: crews[i] * shiftHours[i],
    }))
    .filter((r) => r.quantity > 0);
}

async function main() {
  console.log('Seeding database users...');

  const createdUsers: Record<string, any> = {};
  for (const userData of usersToSeed) {
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: userData,
        create: userData,
      });
      createdUsers[userData.email] = user;
      console.log(`Upserted user: ${user.firstName} ${user.lastName} (${user.email})`);
    } catch (e) {
      console.error(`Failed to upsert user ${userData.email}, trying to fetch existing:`, e.message);
      const user = await prisma.user.findUnique({ where: { email: userData.email } });
      if (user) createdUsers[userData.email] = user;
    }
  }

  console.log('Seeding departments...');
  const createdDepartments: Record<string, any> = {};
  for (const dept of departmentsToSeed) {
    const department = await prisma.departments.upsert({
      where: { name: dept.name },
      update: { icon: dept.icon },
      create: { name: dept.name, icon: dept.icon, is_active: true },
    });
    createdDepartments[dept.name] = department;
    console.log(`Upserted department: ${department.name}`);
  }

  console.log('Seeding currency PLN...');
  const currency = await prisma.currencies.upsert({
    where: { code: 'PLN' },
    update: {},
    create: { code: 'PLN', name: 'Złoty', symbol: 'zł' },
  });

  console.log('Seeding project type PV...');
  let projectType = await prisma.project_types.findUnique({ where: { code: 'PV' } });
  if (!projectType) {
    projectType = await prisma.project_types.create({
      data: { code: 'PV', name: 'Fotowoltaika', description: 'Instalacje fotowoltaiczne' },
    });
  }

  console.log('Seeding mock contractor...');
  let contractor = await prisma.contractors.findFirst({ where: { name: 'Mock Contractor Sp. z o.o.' } });
  if (!contractor) {
    contractor = await prisma.contractors.create({
      data: {
        name: 'Mock Contractor Sp. z o.o.',
        short_name: 'Mock',
        tax_number: '1234567890',
        city: 'Warszawa',
        country: 'Polska',
      }
    });
  }

  console.log('Linking contractor user to contractor...');
  if (createdUsers['jan.wykonawca@ispik.eu']) {
    await prisma.user.update({
      where: { id: createdUsers['jan.wykonawca@ispik.eu'].id },
      data: { contractor_id: contractor.id }
    });
  }

  console.log('Seeding project Projekt Pokazowy PV 10MW...');
  let project = await prisma.projects.findFirst({ where: { name: 'Projekt Pokazowy PV 10MW' } });
  const projectData = {
    name: 'Projekt Pokazowy PV 10MW',
    contractor_id: contractor.id,
    project_type_id: projectType.id,
    country: 'Polska',
    city: 'Gdańsk',
    currency: 'PLN',
    status: 'ACTIVE',
    contract_net_value: 2842715.00,
    power: 10.00,
    start_date_contract: new Date('2026-01-01'),
    end_date_contract: new Date('2026-12-31'),
    start_date_fact: new Date('2026-01-15'),
    vat_rate: 23,
    payment_term_days: 30,
    warranty_percent: 5,
    warranty_months: 60,
    manager_id: createdUsers['anna.nowakowska@ispik.eu']?.id || null,
    created_by: createdUsers['tymur.kuchynskyi@ispik.eu']?.id || null,
  };

  if (!project) {
    project = await prisma.projects.create({ data: projectData });
  } else {
    project = await prisma.projects.update({
      where: { id: project.id },
      data: projectData
    });
  }

  console.log('Assigning departments and foremen to project...');
  // We match foremen emails manually based on our usersToSeed mapping to departments
  const departmentForemanMapping = [
    { deptName: 'Kafar', email: 'jan.kowalski@ispik.eu' },
    { deptName: 'Montaż', email: 'piotr.nowak@ispik.eu' },
    { deptName: 'Elektryka', email: 'adam.wisniewski@ispik.eu' },
    { deptName: 'Kable AC', email: 'marek.wojcik@ispik.eu' },
  ];

  for (const mapping of departmentForemanMapping) {
    const deptId = createdDepartments[mapping.deptName]?.id;
    const foremanId = createdUsers[mapping.email]?.id;

    if (deptId) {
      // Upsert project_departments
      await prisma.project_departments.upsert({
        where: {
          project_id_department_id: { project_id: project.id, department_id: deptId }
        },
        update: {},
        create: {
          project_id: project.id,
          department_id: deptId,
        }
      });

      // Upsert project_department_foremen (just delete existing and create to be simple)
      if (foremanId) {
        const existingAssignment = await prisma.project_department_foremen.findFirst({
          where: { project_id: project.id, department_id: deptId, foreman_id: foremanId }
        });

        if (!existingAssignment) {
          await prisma.project_department_foremen.create({
            data: {
              project_id: project.id,
              department_id: deptId,
              foreman_id: foremanId,
            }
          });
        }
      }
    }
  }

  console.log('Seeding milestones...');
  await prisma.milestones.deleteMany({ where: { project_id: project.id } });

  const milestonesToSeed = [
    { no: 'KM 1', desc: 'Prace przygotowawcze (montaż kontenerów, umieszczenie tablic)', perc: 10.0, net: 284271.50, invoices: [{ invoiceNo: 'FV/06/05/2026/1', amount: 284271.50, date: '2026-05-06', isPaid: true }] },
    { no: 'KM 2', desc: 'Wykonanie ogrodzenia', perc: 15.0, net: 426407.25, invoices: [{ invoiceNo: 'FV/06/06/2026/1', amount: 213203.62, date: '2026-06-06', isPaid: true }] },
    { no: 'KM 3', desc: 'Wykonanie prac wodociągowych', perc: 10.0, net: 284271.50, invoices: [{ invoiceNo: 'FV/07/07/2026/1', amount: 94757.16, date: '2026-07-07', isPaid: false }] },
    { no: 'KM 4', desc: 'Wykonanie fundamentów pod stacje', perc: 15.0, net: 426407.25, invoices: [{ invoiceNo: 'FV/08/08/2026/1', amount: 106601.81, date: '2026-08-08', isPaid: false }] },
    { no: 'KM 5', desc: 'Wykonanie systemu uziemienia', perc: 20.0, net: 568543.00, invoices: [] },
    { no: 'KM 6', desc: 'Wykonanie połączeń kablowych (Kable AC i DC)', perc: 20.0, net: 568543.00, invoices: [] },
    { no: 'KM 7', desc: 'Odbiór końcowy', perc: 10.0, net: 284271.50, invoices: [] },
  ];

  const createdMilestones: Record<string, any> = {};
  for (const ms of milestonesToSeed) {
    const totalInvoiced = ms.invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const invPerc = ms.net > 0 ? (totalInvoiced / ms.net) * 100 : 0;

    let existingMs = await prisma.milestones.findUnique({
      where: { project_id_milestone_no: { project_id: project.id, milestone_no: ms.no } }
    });

    if (existingMs) {
      existingMs = await prisma.milestones.update({
        where: { id: existingMs.id },
        data: {
          description: ms.desc,
          percentage: ms.perc,
          net_amount: ms.net,
          invoicing_percentage: invPerc
        }
      });
      createdMilestones[ms.no] = existingMs;
    } else {
      const newMs = await prisma.milestones.create({
        data: {
          project_id: project.id,
          milestone_no: ms.no,
          description: ms.desc,
          percentage: ms.perc,
          net_amount: ms.net,
          invoicing_percentage: invPerc,
        }
      });
      createdMilestones[ms.no] = newMs;
    }

    // Sync invoices
    await prisma.milestones_invoices.deleteMany({
      where: { milestone_id: createdMilestones[ms.no].id }
    });

    for (const inv of ms.invoices) {
      await prisma.milestones_invoices.create({
        data: {
          milestone_id: createdMilestones[ms.no].id,
          invoice_number: inv.invoiceNo,
          net_value: inv.amount,
          note: 'Wystawiona kwota ' + inv.amount,
          issued_date: new Date(inv.date),
          paid_at: inv.isPaid ? new Date(inv.date) : null,
          status: inv.isPaid ? 'ZAPŁACONE' : 'WYSTAWIONA',
        }
      });
    }
  }

  console.log('Seeding cost categories...');
  const categoriesToSeed = [
    { name: 'Wypłata', is_salary: true },
    { name: 'Hostel / Zakwaterowanie', is_salary: false },
    { name: 'Maszyny / Sprzęt', is_salary: false },
    { name: 'Paliwo', is_salary: false },
    { name: 'Narzędzia', is_salary: false },
  ];

  const createdCostCategories: Record<string, any> = {};
  for (const cat of categoriesToSeed) {
    let existingCat = await prisma.cost_categories.findFirst({ where: { name: cat.name } });
    if (!existingCat) {
      existingCat = await prisma.cost_categories.create({
        data: { name: cat.name, is_salary: cat.is_salary }
      });
    }
    createdCostCategories[cat.name] = existingCat;
  }

  console.log('Seeding project budget items and planned expenses...');
  const budgetItems = [
    { cat: 'Wypłata', amount: 500000 },
    { cat: 'Hostel / Zakwaterowanie', amount: 80000 },
    { cat: 'Maszyny / Sprzęt', amount: 200000 },
    { cat: 'Paliwo', amount: 50000 },
    { cat: 'Narzędzia', amount: 30000 },
  ];

  for (const item of budgetItems) {
    const catId = createdCostCategories[item.cat]?.id;
    if (catId) {
      let existingBudget = await prisma.project_budget_items.findFirst({
        where: { project_id: project.id, cost_category_id: catId }
      });
      if (!existingBudget) {
        await prisma.project_budget_items.create({
          data: {
            project_id: project.id,
            cost_category_id: catId,
            planned_amount: item.amount,
          }
        });
      }

      let existingPlannedExpense = await prisma.planned_expenses.findFirst({
        where: { project_id: project.id, cost_category_id: catId }
      });
      if (!existingPlannedExpense) {
        await prisma.planned_expenses.create({
          data: {
            project_id: project.id,
            cost_category_id: catId,
            planned_percent: 25,
            planned_date: new Date('2026-12-31'),
          }
        });
      }
    }
  }

  console.log('Cleaning up old works and reports...');
  await prisma.daily_reports.deleteMany({ where: { project_id: project.id } });
  await prisma.project_work_types.deleteMany({ where: { project_id: project.id } });

  console.log('Seeding project work types...');
  // Realistic course of a 10 MW PV build (~12 ha), as seen on 14.10.2026:
  // KM 1–3 finished, KM 4–5 in progress (one work late), KM 6 just started, KM 7 ahead.
  // `perc` within each milestone sums to 100.
  const worksToSeed = [
    // KM 1: Prace przygotowawcze — finished
    { km: 'KM 1', dept: 'Kafar', name: 'Niwelacja i utwardzenie placu budowy', unit: 'm2', qty: 2400, actual: 2400, start: '2026-01-19', end: '2026-01-30', perc: 45 },
    { km: 'KM 1', dept: 'Montaż', name: 'Montaż kontenerów socjalnych', unit: 'szt', qty: 5, actual: 5, start: '2026-01-26', end: '2026-02-03', perc: 35 },
    { km: 'KM 1', dept: 'Montaż', name: 'Montaż tablic informacyjnych', unit: 'szt', qty: 2, actual: 2, start: '2026-02-02', end: '2026-02-04', perc: 20 },

    // KM 2: Wykonanie ogrodzenia — finished (~2,6 km perimeter)
    { km: 'KM 2', dept: 'Kafar', name: 'Wbijanie słupków ogrodzenia', unit: 'szt', qty: 1040, actual: 1040, start: '2026-02-16', end: '2026-03-27', perc: 35 },
    { km: 'KM 2', dept: 'Montaż', name: 'Montaż siatki ogrodzeniowej', unit: 'mb', qty: 2600, actual: 2600, start: '2026-03-09', end: '2026-04-24', perc: 45 },
    { km: 'KM 2', dept: 'Montaż', name: 'Montaż bram wjazdowych', unit: 'szt', qty: 2, actual: 2, start: '2026-04-27', end: '2026-05-06', perc: 20 },

    // KM 3: Wykonanie prac wodociągowych — finished
    { km: 'KM 3', dept: 'Kafar', name: 'Wykopy pod rurociąg', unit: 'mb', qty: 650, actual: 650, start: '2026-05-11', end: '2026-05-29', perc: 35 },
    { km: 'KM 3', dept: 'Montaż', name: 'Montaż rurociągu PE', unit: 'mb', qty: 650, actual: 650, start: '2026-05-18', end: '2026-06-12', perc: 45 },
    { km: 'KM 3', dept: 'Kafar', name: 'Zasypanie i zagęszczenie wykopów', unit: 'mb', qty: 650, actual: 650, start: '2026-06-08', end: '2026-06-26', perc: 20 },

    // KM 4: Fundamenty pod stacje — in progress, concreting slightly behind, backfill starts soon
    { km: 'KM 4', dept: 'Kafar', name: 'Wykopy pod fundamenty stacji', unit: 'm3', qty: 180, actual: 180, start: '2026-07-06', end: '2026-07-24', perc: 20 },
    { km: 'KM 4', dept: 'Montaż', name: 'Zbrojenie fundamentów', unit: 't', qty: 14, actual: 14, start: '2026-07-20', end: '2026-08-21', perc: 25 },
    { km: 'KM 4', dept: 'Montaż', name: 'Betonowanie fundamentów', unit: 'm3', qty: 120, actual: 78, start: '2026-08-17', end: '2026-10-23', perc: 40 },
    { km: 'KM 4', dept: 'Kafar', name: 'Izolacja i zasypka fundamentów', unit: 'm3', qty: 180, actual: 0, start: '2026-10-19', end: '2026-10-30', perc: 15 },

    // KM 5: System uziemienia — trench done, earthing strip late (past planned end)
    { km: 'KM 5', dept: 'Kable AC', name: 'Wykop pod bednarkę', unit: 'mb', qty: 4200, actual: 4200, start: '2026-08-24', end: '2026-09-25', perc: 30 },
    { km: 'KM 5', dept: 'Elektryka', name: 'Układanie bednarki uziemiającej', unit: 'mb', qty: 4200, actual: 3300, start: '2026-09-07', end: '2026-10-09', perc: 40 },
    { km: 'KM 5', dept: 'Elektryka', name: 'Pomiary rezystancji uziemienia', unit: 'pkt', qty: 24, actual: 0, start: '2026-10-26', end: '2026-11-06', perc: 30 },

    // KM 6: Połączenia kablowe AC/DC — trenching started, cabling ahead
    { km: 'KM 6', dept: 'Kable AC', name: 'Wykop pod kable AC/DC', unit: 'mb', qty: 3100, actual: 1150, start: '2026-09-28', end: '2026-11-06', perc: 25 },
    { km: 'KM 6', dept: 'Elektryka', name: 'Układanie kabli DC', unit: 'mb', qty: 38000, actual: 0, start: '2026-10-19', end: '2026-11-27', perc: 35 },
    { km: 'KM 6', dept: 'Kable AC', name: 'Układanie kabli AC', unit: 'mb', qty: 9300, actual: 0, start: '2026-10-26', end: '2026-11-27', perc: 25 },
    { km: 'KM 6', dept: 'Kable AC', name: 'Zasypywanie wykopów kablowych', unit: 'mb', qty: 3100, actual: 0, start: '2026-11-16', end: '2026-12-04', perc: 15 },

    // KM 7: Odbiór końcowy — not started
    { km: 'KM 7', dept: 'Elektryka', name: 'Pomiary i protokoły odbiorcze', unit: 'kpl', qty: 1, actual: 0, start: '2026-12-07', end: '2026-12-18', perc: 60 },
    { km: 'KM 7', dept: 'Montaż', name: 'Dokumentacja powykonawcza', unit: 'kpl', qty: 1, actual: 0, start: '2026-12-07', end: '2026-12-23', perc: 40 },
  ];

  let reportsCount = 0;
  for (const work of worksToSeed) {
    const deptId = createdDepartments[work.dept]?.id;
    const kmId = createdMilestones[work.km]?.id ?? null;
    if (!deptId) continue;

    const createdWork = await prisma.project_work_types.create({
      data: {
        project_id: project.id,
        department_id: deptId,
        milestone_id: kmId,
        name: work.name,
        unit: work.unit,
        total_quantity: work.qty,
        percentage: work.perc,
        planned_start: new Date(work.start),
        planned_end: new Date(work.end),
      },
    });

    const reports = buildDailyReports({
      name: work.name,
      dept: work.dept,
      start: work.start,
      end: work.end,
      actual: work.actual,
      isFinished: work.actual >= work.qty,
    });
    if (reports.length > 0) {
      await prisma.daily_reports.createMany({
        data: reports.map((r) => ({
          project_id: project.id,
          work_type_id: createdWork.id,
          report_date: r.date,
          actual_quantity: r.quantity,
          actual_workers: r.workers,
          actual_hours: r.hours,
        })),
      });
      reportsCount += reports.length;
    }
  }
  console.log(`Seeded ${worksToSeed.length} work types and ${reportsCount} daily reports.`);

  console.log('Database seeded successfully.');
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
      await pool.end();
    })
    .catch(async (e) => {
      console.error('Error during database seeding:', e);
      await prisma.$disconnect();
      await pool.end();
      process.exit(1);
    });
}
