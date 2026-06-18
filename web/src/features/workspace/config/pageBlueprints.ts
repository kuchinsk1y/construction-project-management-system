import type { WorkspaceSection } from '@/features/workspace/types'

export type PageBlueprint = {
  section: WorkspaceSection
  title: string
  subtitle: string
  goals: string[]
  primaryBlocks: string[]
  dataSources: string[]
}

export const pageBlueprints: Record<WorkspaceSection, PageBlueprint> = {
  projects: {
    section: 'projects',
    title: 'Projects Workspace',
    subtitle: 'Главная страница продукта: портфель проектов с быстрыми действиями.',
    goals: [
      'Быстрый контроль статусов, сроков и рисков по всем проектам.',
      'Фильтрация и сортировка для операционного управления.',
      'Переход в карточку проекта и связанные разделы.',
    ],
    primaryBlocks: [
      'KPI-плашки: active, budget, avg progress.',
      'Таблица портфеля с фильтрами и поиском.',
      'Быстрые действия: открыть, документация, детали.',
    ],
    dataSources: ['projects', 'project_status_history', 'milestones', 'daily_reports'],
  },
  resources: {
    section: 'resources',
    title: 'Resources Planning',
    subtitle: 'Планирование людей, отделов и загрузки по проектам.',
    goals: [
      'Видеть перегрузы бригадиров и отделов заранее.',
      'Сверять плановые и фактические трудозатраты.',
      'Управлять назначениями на уровне проект + отдел.',
    ],
    primaryBlocks: [
      'Календарь загрузки отделов/бригадиров.',
      'План vs факт по часам и людям.',
      'Конфликты ресурсов и рекомендации.',
    ],
    dataSources: [
      'resource_plans',
      'project_department_foremen',
      'work_type_hours_distribution',
      'daily_reports',
      'departments',
      'users',
    ],
  },
  reports: {
    section: 'reports',
    title: 'Operational Reports',
    subtitle: 'Единое место аналитики выполнения и эффективности.',
    goals: [
      'Следить за прогрессом milestones и work types.',
      'Контролировать отклонения сроков и производительности.',
      'Получать еженедельные/ежемесячные срезы.',
    ],
    primaryBlocks: [
      'Прогресс по milestones и этапам.',
      'Производительность по отделам и типам работ.',
      'Отчеты по активности и задержкам.',
    ],
    dataSources: ['milestones', 'project_work_types', 'daily_reports', 'project_status_history'],
  },
  finance: {
    section: 'finance',
    title: 'Finance Control',
    subtitle: 'Финансовый контур проекта: план, факт, инвойсы, платежи.',
    goals: [
      'Управлять cashflow и прогнозом поступлений.',
      'Контролировать маржинальность и перерасход.',
      'Отслеживать просроченные инвойсы и платежи.',
    ],
    primaryBlocks: [
      'Budget plan vs actual и отклонения.',
      'Инвойсы и статусы оплат.',
      'Плановые доходы/расходы по периодам.',
    ],
    dataSources: ['project_budget_items', 'planned_expenses', 'milestones_invoices', 'currencies', 'cost_categories'],
  },
  settings: {
    section: 'settings',
    title: 'System Settings',
    subtitle: 'Администрирование справочников, ролей и конфигурации платформы.',
    goals: [
      'Управлять ролями, доступами и политиками.',
      'Поддерживать справочники проекта.',
      'Настраивать интеграции и поведение системы.',
    ],
    primaryBlocks: [
      'Пользователи и роли (RBAC).',
      'Справочники: project types, departments, cost categories, currencies.',
      'Интеграции и системные параметры.',
    ],
    dataSources: ['users', 'roles', 'user_roles', 'project_types', 'departments', 'cost_categories', 'currencies'],
  },
}
