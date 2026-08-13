import {
  Folder,
  HardHat,
  Zap,
  Wrench,
  Droplets,
  Truck,
  Flame,
  Shield,
  PieChart,
  Briefcase,
  Building,
  Hammer,
  Drill,
  Ruler,
  Paintbrush,
  Settings,
  DollarSign,
  Calculator,
  Users,
  Monitor,
  Network,
  Cable,
  Pickaxe,
  PaintBucket,
  Tractor
} from 'lucide-react'

export type DepartmentIconInfo = {
  id: string
  icon: React.ElementType
  label: string
  tags: string[]
}

export const departmentIcons: DepartmentIconInfo[] = [
  { id: 'Folder', icon: Folder, label: 'Katalog (Domyślne)', tags: ['ogólne', 'default', 'katalog', 'folder'] },
  { id: 'Network', icon: Network, label: 'Sieć / Struktura', tags: ['sieć', 'struktura', 'organizacja', 'dział'] },
  { id: 'HardHat', icon: HardHat, label: 'Budowa / Wykonawstwo', tags: ['budowa', 'kask', 'wykonawstwo', 'roboty', 'inżynier', 'budownictwo'] },
  { id: 'Zap', icon: Zap, label: 'Elektryka', tags: ['prąd', 'elektryka', 'kable', 'zasilanie', 'piorun'] },
  { id: 'Cable', icon: Cable, label: 'Okablowanie / Sieci', tags: ['kable', 'przewody', 'elektryka', 'instalacje'] },
  { id: 'Wrench', icon: Wrench, label: 'Mechanika / Warsztat', tags: ['mechanika', 'warsztat', 'naprawa', 'narzędzia', 'klucz'] },
  { id: 'Droplets', icon: Droplets, label: 'Hydraulika', tags: ['woda', 'hydraulika', 'rury', 'sanitarne', 'krople'] },
  { id: 'Truck', icon: Truck, label: 'Transport / Logistyka', tags: ['transport', 'logistyka', 'dostawy', 'samochód', 'ciężarówka', 'flota'] },
  { id: 'Flame', icon: Flame, label: 'Ogrzewanie / Gaz', tags: ['ogrzewanie', 'gaz', 'ciepło', 'ogień', 'hvac'] },
  { id: 'Shield', icon: Shield, label: 'BHP', tags: ['bhp', 'bezpieczeństwo', 'ochrona', 'tarcza'] },
  { id: 'Building', icon: Building, label: 'Architektura / Konstrukcje', tags: ['architektura', 'budynek', 'konstrukcje', 'projektowanie'] },
  { id: 'Hammer', icon: Hammer, label: 'Ciesielstwo', tags: ['młotek', 'ciesielstwo', 'drewno', 'narzędzia'] },
  { id: 'Pickaxe', icon: Pickaxe, label: 'Roboty Ziemne', tags: ['ziemia', 'wykopy', 'kilof', 'fundamenty'] },
  { id: 'Drill', icon: Drill, label: 'Odwierty / Montaż', tags: ['wiertarka', 'odwierty', 'montaż', 'narzędzia'] },
  { id: 'Ruler', icon: Ruler, label: 'Geodezja / Pomiary', tags: ['geodezja', 'pomiary', 'linijka', 'wymiary'] },
  { id: 'Paintbrush', icon: Paintbrush, label: 'Wykończenia', tags: ['malowanie', 'wykończenia', 'pędzel', 'farba'] },
  { id: 'PaintBucket', icon: PaintBucket, label: 'Malarstwo', tags: ['wiadro', 'farba', 'malowanie'] },
  { id: 'Settings', icon: Settings, label: 'Techniczne / Serwis', tags: ['serwis', 'techniczne', 'ustawienia', 'zębatka'] },
  { id: 'Briefcase', icon: Briefcase, label: 'Zarząd / Dyrekcja', tags: ['zarząd', 'dyrekcja', 'biuro', 'teczka'] },
  { id: 'DollarSign', icon: DollarSign, label: 'Koszty', tags: ['koszty', 'pieniądze', 'finanse', 'dolar'] },
  { id: 'PieChart', icon: PieChart, label: 'Analityka', tags: ['analityka', 'wykres', 'statystyki'] },
  { id: 'Calculator', icon: Calculator, label: 'Księgowość / Finanse', tags: ['finanse', 'księgowość', 'kalkulator', 'faktury'] },
  { id: 'Users', icon: Users, label: 'HR / Kadry', tags: ['hr', 'kadry', 'ludzie', 'pracownicy'] },
  { id: 'Monitor', icon: Monitor, label: 'IT', tags: ['it', 'komputery', 'informatyka', 'systemy'] },
  { id: 'Tractor', icon: Tractor, label: 'Sprzęt Ciężki', tags: ['sprzęt', 'maszyny', 'traktor', 'koparka'] },
]

export function getDepartmentIcon(id: string | undefined): DepartmentIconInfo {
  if (!id) return departmentIcons[0]
  const found = departmentIcons.find(icon => icon.id === id)
  return found || departmentIcons[0]
}
