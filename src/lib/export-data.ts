import type { ActivityType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ExportRow = {
  date: string // dd/mm/yyyy
  title: string
  description: string
  activityType: string // label italiana lowercase
  hours: number
  overtimeHours: number | null // valorizzato solo sulla prima entry del giorno
  client: string
  project: string
  tags: string // nomi separati da ';'
}

export type ExportSummaryRow = {
  client: string
  project: string
  activityType: string // label italiana lowercase
  totalHours: number
  overtimeHours: number
}

export type ExportDataset = {
  rows: ExportRow[]
  summary: ExportSummaryRow[]
  grandTotal: { totalHours: number; overtimeHours: number }
}

export type ExportFilters = {
  year: number
  month: number // 1-12
  type?: ActivityType | null
  client?: string | null
}

/** Calendar month boundaries in UTC — matches date-only strings from HTML inputs (parsed as UTC). */
function monthRangeUtc(year: number, month1to12: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month1to12, 1, 0, 0, 0, 0))
  return { start, end }
}

function activityTypeLabel(t: ActivityType): string {
  if (t === 'MANUTENZIONE') return 'manutenzione'
  if (t === 'PERMESSO') return 'permesso'
  if (t === 'FERIE') return 'ferie'
  if (t === 'STRAORDINARIO') return 'straordinario'
  return 'supporto'
}

function formatDateUtc(d: Date): string {
  const [year, month, day] = d.toISOString().slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100
}

/**
 * Costruisce il dataset dell'export per un mese, applicando gli eventuali filtri UI
 * (tipo attività, cliente) alle sole righe di dettaglio.
 *
 * Gli straordinari giornalieri (minuti oltre 480 = 8h) sono calcolati sull'INTERO giorno
 * non filtrato, così restano corretti anche esportando un solo cliente/tipo. L'importo dello
 * straordinario è attribuito una sola volta al giorno, sulla prima entry in ordine cronologico,
 * e viene emesso solo se quella entry supera il filtro.
 */
export async function buildExportDataset(filters: ExportFilters): Promise<ExportDataset> {
  const { start, end } = monthRangeUtc(filters.year, filters.month)

  // Carica sempre l'intero mese: serve per i totali giornalieri anche quando si filtra.
  const monthEntries = await prisma.timeEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { client: true, project: true, tags: true },
    orderBy: { date: 'asc' },
  })

  // Totali giornalieri (minuti) su tutte le entry del giorno, filtri esclusi.
  const dayTotals = new Map<string, number>()
  const firstEntryIdByDay = new Map<string, string>()
  for (const e of monthEntries) {
    const dateKey = e.date.toISOString().slice(0, 10)
    dayTotals.set(dateKey, (dayTotals.get(dateKey) ?? 0) + e.duration)
    if (!firstEntryIdByDay.has(dateKey)) {
      firstEntryIdByDay.set(dateKey, e.id)
    }
  }

  // Applica i filtri UI solo alle righe visualizzate.
  const filtered = monthEntries.filter((e) => {
    if (filters.type && e.activityType !== filters.type) return false
    if (filters.client && (e.client?.name ?? '') !== filters.client) return false
    return true
  })

  // Ordinamento riepilogativo: cliente → progetto → data → titolo (locale italiano).
  const sortedEntries = [...filtered].sort((a, b) => {
    const clientCmp = (a.client?.name ?? '').localeCompare(b.client?.name ?? '', 'it')
    if (clientCmp !== 0) return clientCmp
    const projectCmp = (a.project?.name ?? '').localeCompare(b.project?.name ?? '', 'it')
    if (projectCmp !== 0) return projectCmp
    const dateCmp = a.date.getTime() - b.date.getTime()
    if (dateCmp !== 0) return dateCmp
    return a.title.localeCompare(b.title, 'it')
  })

  const rows: ExportRow[] = []
  const summaryMap = new Map<string, ExportSummaryRow>()
  let grandTotalHours = 0
  let grandOvertimeHours = 0

  for (const e of sortedEntries) {
    const dateKey = e.date.toISOString().slice(0, 10)
    const isFirst = firstEntryIdByDay.get(dateKey) === e.id
    const dayOt = Math.max(0, (dayTotals.get(dateKey) ?? 0) - 480)
    const overtimeHours = isFirst ? roundHours(dayOt / 60) : 0
    const activityType = activityTypeLabel(e.activityType)

    rows.push({
      date: formatDateUtc(e.date),
      title: e.title,
      description: e.description ?? '',
      activityType,
      hours: roundHours(e.duration / 60),
      overtimeHours: isFirst ? overtimeHours : null,
      client: e.client?.name ?? '',
      project: e.project?.name ?? '',
      tags: e.tags.map((t) => t.name).join(';'),
    })

    const clientName = e.client?.name ?? ''
    const projectName = e.project?.name ?? ''
    const summaryKey = JSON.stringify([clientName, projectName, activityType])
    const existing = summaryMap.get(summaryKey) ?? {
      client: clientName,
      project: projectName,
      activityType,
      totalHours: 0,
      overtimeHours: 0,
    }
    existing.totalHours += e.duration / 60
    existing.overtimeHours += overtimeHours
    summaryMap.set(summaryKey, existing)

    grandTotalHours += e.duration / 60
    grandOvertimeHours += overtimeHours
  }

  const summary = [...summaryMap.values()]
    .map((item) => ({
      client: item.client,
      project: item.project,
      activityType: item.activityType,
      totalHours: roundHours(item.totalHours),
      overtimeHours: roundHours(item.overtimeHours),
    }))
    .sort((a, b) => {
      const clientCmp = a.client.localeCompare(b.client, 'it')
      if (clientCmp !== 0) return clientCmp
      const projectCmp = a.project.localeCompare(b.project, 'it')
      if (projectCmp !== 0) return projectCmp
      return a.activityType.localeCompare(b.activityType, 'it')
    })

  return {
    rows,
    summary,
    grandTotal: {
      totalHours: roundHours(grandTotalHours),
      overtimeHours: roundHours(grandOvertimeHours),
    },
  }
}
