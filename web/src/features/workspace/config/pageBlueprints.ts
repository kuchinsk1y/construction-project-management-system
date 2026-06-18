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
    title: 'Przestrzen Projektow',
    subtitle: 'Glowna strona produktu: portfolio projektow z szybkimi akcjami.',
    goals: [
      'Szybka kontrola statusow, terminow i ryzyk we wszystkich projektach.',
      'Filtrowanie i sortowanie dla zarzadzania operacyjnego.',
      'Przejscie do karty projektu i powiazanych sekcji.',
    ],
    primaryBlocks: [
      'Kafelki KPI: aktywne, budzet, sredni postep.',
      'Tabela portfolio z filtrami i wyszukiwaniem.',
      'Szybkie akcje: otworz, dokumentacja, szczegoly.',
    ],
    dataSources: ['projects', 'project_status_history', 'milestones', 'daily_reports'],
  },
  resources: {
    section: 'resources',
    title: 'Planowanie Zasobow',
    subtitle: 'Planowanie ludzi, dzialow i obciazenia projektow.',
    goals: [
      'Wczesnie wykrywac przeciazenia brygadzistow i dzialow.',
      'Porownywac planowane i faktyczne naklady pracy.',
      'Zarzadzac przypisaniami na poziomie projekt + dzial.',
    ],
    primaryBlocks: [
      'Kalendarz obciazenia dzialow i brygadzistow.',
      'Plan vs fakt dla godzin i liczby osob.',
      'Konflikty zasobow i rekomendacje.',
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
    title: 'Raporty Operacyjne',
    subtitle: 'Jedno miejsce do analizy realizacji i efektywnosci.',
    goals: [
      'Sledzic postep kamieni milowych i typow prac.',
      'Kontrolowac odchylenia terminow oraz wydajnosci.',
      'Otrzymywac przekroje tygodniowe i miesieczne.',
    ],
    primaryBlocks: [
      'Postep wedlug kamieni milowych i etapow.',
      'Wydajnosc wedlug dzialow i typow prac.',
      'Raporty aktywnosci oraz opoznien.',
    ],
    dataSources: ['milestones', 'project_work_types', 'daily_reports', 'project_status_history'],
  },
  finance: {
    section: 'finance',
    title: 'Kontrola Finansow',
    subtitle: 'Finanse projektu: plan, fakt, faktury i platnosci.',
    goals: [
      'Zarzadzac cashflow i prognoza przychodow.',
      'Kontrolowac marze i przekroczenia kosztow.',
      'Sledzic przeterminowane faktury i platnosci.',
    ],
    primaryBlocks: [
      'Budzet planowany vs rzeczywisty i odchylenia.',
      'Faktury i statusy platnosci.',
      'Planowane przychody i koszty w okresach.',
    ],
    dataSources: ['project_budget_items', 'planned_expenses', 'milestones_invoices', 'currencies', 'cost_categories'],
  },
  users: {
    section: 'users',
    title: 'Panel Uzytkownikow',
    subtitle: 'Administracja kontami, rolami i statusem aktywnosci.',
    goals: [
      'Szybko wyszukiwac i edytowac konta pracownikow.',
      'Kontrolowac role, aktywnosc i dane kontaktowe.',
      'Utrzymywac porzadek uprawnien dla zespolu.',
    ],
    primaryBlocks: [
      'Tabela uzytkownikow z filtrowaniem i statusem.',
      'Szybkie dodawanie nowego konta.',
      'Widok roli, Telegram ID i danych kontaktowych.',
    ],
    dataSources: ['users', 'roles', 'user_roles'],
  },
  settings: {
    section: 'settings',
    title: 'Ustawienia Systemu',
    subtitle: 'Administracja slownikami, rolami i konfiguracja platformy.',
    goals: [
      'Zarzadzac rolami, dostepami i politykami.',
      'Utrzymywac slowniki projektowe.',
      'Konfigurowac integracje i zachowanie systemu.',
    ],
    primaryBlocks: [
      'Uzytkownicy i role (RBAC).',
      'Slowniki: typy projektow, dzialy, kategorie kosztow, waluty.',
      'Integracje i parametry systemowe.',
    ],
    dataSources: ['users', 'roles', 'user_roles', 'project_types', 'departments', 'cost_categories', 'currencies'],
  },
}
