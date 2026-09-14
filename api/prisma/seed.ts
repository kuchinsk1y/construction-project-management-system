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
    { no: 'KM 1', desc: 'Prace przygotowawcze (montaż kontenerów, umieszczenie tablic)', perc: 10.0, net: 284271.50, invoices: [{ invoiceNo: 'FV/06/05/2026/1', amount: 284271.50, date: '2026-05-06' }] },
    { no: 'KM 2', desc: 'Wykonanie ogrodzenia', perc: 15.0, net: 426407.25, invoices: [{ invoiceNo: 'FV/06/06/2026/1', amount: 213203.62, date: '2026-06-06' }] },
    { no: 'KM 3', desc: 'Wykonanie prac wodociągowych', perc: 10.0, net: 284271.50, invoices: [{ invoiceNo: 'FV/07/07/2026/1', amount: 94757.16, date: '2026-07-07' }] },
    { no: 'KM 4', desc: 'Wykonanie fundamentów pod stacje', perc: 15.0, net: 426407.25, invoices: [{ invoiceNo: 'FV/08/08/2026/1', amount: 106601.81, date: '2026-08-08' }] },
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
          paid_at: new Date(inv.date),
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
  const worksToSeed = [
    // KM 1: Prace przygotowawcze (100% completed)
    { name: 'Montaż kontenerów', unit: 'szt', qty: 4, actual: 4, dept: 'Montaż', km: 'KM 1', start: '2026-02-01', end: '2026-02-10', perc: 10 },
    { name: 'Ustawienie tablic informacyjnych', unit: 'szt', qty: 2, actual: 2, dept: 'Montaż', km: 'KM 1', start: '2026-02-11', end: '2026-02-12', perc: 5 },

    // KM 2: Wykonanie ogrodzenia (100% completed)
    { name: 'Wbijanie kafarów', unit: 'szt', qty: 2000, actual: 2000, dept: 'Kafar', km: 'KM 2', start: '2026-02-15', end: '2026-03-01', perc: 20 },
    { name: 'Montaż słupków i siatki', unit: 'mb', qty: 5000, actual: 5000, dept: 'Montaż', km: 'KM 2', start: '2026-03-02', end: '2026-03-20', perc: 50 },

    // KM 3: Wykonanie prac wodociągowych (100% completed)
    { name: 'Wykopy pod rury wodociągowe', unit: 'mb', qty: 800, actual: 800, dept: 'Kafar', km: 'KM 3', start: '2026-03-21', end: '2026-03-28', perc: 40 },
    { name: 'Montaż instalacji wodnej', unit: 'mb', qty: 800, actual: 800, dept: 'Montaż', km: 'KM 3', start: '2026-03-25', end: '2026-04-05', perc: 60 },

    // KM 4: Wykonanie fundamentów pod stacje (In progress)
    { name: 'Wykopy pod fundamenty', unit: 'm3', qty: 500, actual: 100, dept: 'Kafar', km: 'KM 4', start: '2026-04-01', end: '2026-04-15', perc: 30 },
    { name: 'Wylanie betonu', unit: 'm3', qty: 300, actual: 0, dept: 'Montaż', km: 'KM 4', start: '2026-04-16', end: '2026-04-30', perc: 70 },

    // KM 6: Wykonanie połączeń kablowych (Not started)
    { name: 'Układanie kabli DC', unit: 'mb', qty: 25000, actual: 0, dept: 'Elektryka', km: 'KM 6', start: '2026-05-02', end: '2026-06-01', perc: 40 },
    { name: 'Wykop pod kabel AC', unit: 'mb', qty: 1500, actual: 0, dept: 'Kable AC', km: 'KM 6', start: '2026-06-02', end: '2026-07-01', perc: 60 },
  ];

  for (const work of worksToSeed) {
    const deptId = createdDepartments[work.dept]?.id;
    const kmId = work.km ? createdMilestones[work.km]?.id : null;

    if (deptId) {
      let existingWork = await prisma.project_work_types.findFirst({
        where: { project_id: project.id, name: work.name }
      });

      if (!existingWork) {
        await prisma.project_work_types.create({
          data: {
            project_id: project.id,
            department_id: deptId,
            milestone_id: kmId,
            name: work.name,
            unit: work.unit,
            total_quantity: work.qty,
            percentage: work.perc,
            planned_start: work.start ? new Date(work.start) : null,
            planned_end: work.end ? new Date(work.end) : null,
          }
        });
      } else {
        await prisma.project_work_types.update({
          where: { id: existingWork.id },
          data: {
            percentage: work.perc,
            planned_start: work.start ? new Date(work.start) : null,
            planned_end: work.end ? new Date(work.end) : null,
          }
        });
      }

      if (work.actual > 0) {
        const theWork = await prisma.project_work_types.findFirst({
          where: { project_id: project.id, name: work.name }
        });
        if (theWork) {
          // Check if there is already a daily report
          const existingReport = await prisma.daily_reports.findFirst({
            where: { project_id: project.id, work_type_id: theWork.id }
          });
          if (!existingReport) {
            await prisma.daily_reports.create({
              data: {
                project_id: project.id,
                work_type_id: theWork.id,
                report_date: new Date('2026-02-10'),
                actual_quantity: work.actual,
              }
            });
          } else {
            await prisma.daily_reports.update({
              where: { id: existingReport.id },
              data: { actual_quantity: work.actual }
            });
          }
        }
      }
    }
  }

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
