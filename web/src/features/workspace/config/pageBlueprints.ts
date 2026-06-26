import type { WorkspaceSection } from '@/features/workspace/types'

export type PageBlueprint = {
  section: WorkspaceSection
  title: string
  subtitle: string
  goals: string[]
  primaryBlocks: string[]
  dataSources: string[]
}

export const pageBlueprints: Partial<Record<WorkspaceSection, PageBlueprint>> = {
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
