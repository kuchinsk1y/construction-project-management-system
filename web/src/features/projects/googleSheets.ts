import type { ApiProjectRow, ProjectItem, ProjectStatus } from '@/features/projects/types'

function parseStatus(value: string): ProjectStatus {
  const normalized = value.trim().toLowerCase()
  if (['done', 'completed', 'finish', 'finished'].includes(normalized)) return 'done'
  if (['blocked', 'risk', 'at risk', 'paused'].includes(normalized)) return 'blocked'
  if (['planning', 'backlog', 'queued'].includes(normalized)) return 'planning'
  return 'active'
}

function parseNumber(input: string): number {
  const normalized = input.replace(/[^0-9.-]+/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseProgress(input: string): number {
  const parsed = Math.round(parseNumber(input))
  if (parsed < 0) return 0
  if (parsed > 100) return 100
  return parsed
}

export async function fetchProjectsFromGoogleSheets(): Promise<ProjectItem[]> {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const url = `${baseUrl}/sheets/projects`

  const response = await fetch(url)
  if (!response.ok) throw new Error('Nie udalo sie pobrac danych z Google Sheets')

  const rows = (await response.json()) as ApiProjectRow[]

  return rows
    .map((row, index): ProjectItem => {
      const name = row.project?.trim() || `Projekt ${index + 1}`
      const statusRaw = row.status ?? 'active'
      const owner = row.manager?.trim() || 'Nieprzypisany'
      const budget = parseNumber(row.power ?? '')
      const progress = parseProgress(row.pin ?? '')
      const startDate = row.dateFromFact?.trim() || row.dateFrom?.trim() || ''
      const endDate = row.dateToFact?.trim() || row.dateTo?.trim() || ''
      const dueDate = row.dateToFact?.trim() || row.dateTo?.trim() || 'Brak terminu'
      const priority = row.projectType?.trim() || 'Ogolny'
      const health = row.status?.trim() || (progress >= 70 ? 'Zgodnie z planem' : 'Wymaga uwagi')

      return {
        id: row.id?.trim() || `${name}-${index}`,
        name,
        status: parseStatus(statusRaw),
        owner,
        budget,
        progress,
        startDate,
        endDate,
        dueDate,
        priority,
        health,
        location: row.location?.trim() || 'Nieznana lokalizacja',
        country: row.country?.trim() || '-',
        contractor: row.contractor?.trim() || '-',
        projectType: row.projectType?.trim() || '-',
        dokumentationUrl: row.dokumentationUrl?.trim() || null,
      }
    })
    .filter((item) => item.name.length > 0)
}
