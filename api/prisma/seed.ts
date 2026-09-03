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
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    });
    createdUsers[userData.email] = user;
    console.log(`Upserted user: ${user.firstName} ${user.lastName} (${user.email})`);
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
    contract_net_value: 1000000,
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
  const milestonesToSeed = [
    { no: 'KM01', desc: 'Zaliczka', perc: 20, net: 200000, invPerc: 100 },
    { no: 'KM02', desc: 'Dostawa konstrukcji', perc: 40, net: 400000, invPerc: 100 },
    { no: 'KM03', desc: 'Uruchomienie', perc: 40, net: 400000, invPerc: 100 },
  ];

  const createdMilestones: Record<string, any> = {};
  for (const ms of milestonesToSeed) {
    let existingMs = await prisma.milestones.findUnique({
      where: { project_id_milestone_no: { project_id: project.id, milestone_no: ms.no } }
    });

    if (existingMs) {
      existingMs = await prisma.milestones.update({
        where: { id: existingMs.id },
        data: { net_amount: ms.net, invoicing_percentage: ms.invPerc }
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
          invoicing_percentage: ms.invPerc,
        }
      });
      createdMilestones[ms.no] = newMs;
    }
  }

  console.log('Seeding cost categories...');
  const categoriesToSeed = [
    { name: 'Materiały', is_salary: false },
    { name: 'Wypłata', is_salary: true },
    { name: 'Sprzęt', is_salary: false },
    { name: 'Podwykonawcy', is_salary: false },
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
    { cat: 'Materiały', amount: 400000 },
    { cat: 'Wypłata', amount: 200000 },
    { cat: 'Sprzęt', amount: 100000 },
    { cat: 'Podwykonawcy', amount: 150000 },
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

  console.log('Seeding project work types...');
  const worksToSeed = [
    { name: 'Wbijanie kafarów', unit: 'szt', qty: 2000, dept: 'Kafar', km: 'KM02', start: '2026-02-01', end: '2026-03-01', perc: 20 },
    { name: 'Montaż stołów', unit: 'kpl', qty: 500, dept: 'Montaż', km: 'KM02', start: '2026-03-02', end: '2026-04-01', perc: 70 },
    { name: 'Montaż modułów PV', unit: 'szt', qty: 15000, dept: 'Montaż', km: 'KM02', start: '2026-04-02', end: '2026-05-01', perc: 10 },
    { name: 'Układanie kabli DC', unit: 'mb', qty: 25000, dept: 'Elektryka', km: 'KM03', start: '2026-05-02', end: '2026-06-01', perc: 10 },
    { name: 'Podłączenie inwerterów', unit: 'kpl', qty: 40, dept: 'Elektryka', km: 'KM03', start: '2026-06-02', end: '2026-07-01', perc: 10 },
    { name: 'Wykop pod kabel AC', unit: 'mb', qty: 1500, dept: 'Kable AC', km: 'KM03', start: '2026-07-02', end: '2026-08-01', perc: 80 },
    { name: 'Roboty ziemne dodatkowe', unit: 'godz', qty: 100, dept: 'Kafar', km: null, start: '2026-08-02', end: '2026-09-01', perc: 0 }, // dodatkowe
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
