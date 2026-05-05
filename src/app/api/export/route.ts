import { NextRequest } from 'next/server'
import type { ActivityType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function activityTypeCsvLabel(t: ActivityType): string {
  if (t === 'MANUTENZIONE') return 'manutenzione'
  if (t === 'PERMESSO') return 'permesso'
  if (t === 'FERIE') return 'ferie'
  if (t === 'STRAORDINARIO') return 'straordinario'
  return 'supporto'
}

/** Calendar month boundaries in UTC — matches date-only strings from HTML inputs (parsed as UTC). */
function monthRangeUtc(year: number, month1to12: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month1to12, 1, 0, 0, 0, 0))
  return { start, end }
}

function csvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function formatDateUtc(d: Date): string {
  const [year, month, day] = d.toISOString().slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100
}

export async function GET(request: NextRequest) {
  const yearStr = request.nextUrl.searchParams.get('year')
  const monthStr = request.nextUrl.searchParams.get('month')

  if (!yearStr || !monthStr) {
    return new Response('Parametri year e month obbligatori', { status: 400 })
  }

  const year = Number(yearStr)
  const month = Number(monthStr)

  if (
    !Number.isInteger(year) ||
    year < 1970 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return new Response('year o month non validi', { status: 400 })
  }

  const { start, end } = monthRangeUtc(year, month)

  const entries = await prisma.timeEntry.findMany({
    where: {
      date: {
        gte: start,
        lt: end,
      },
    },
    include: { client: true, project: true, tags: true },
    orderBy: { date: 'asc' },
  })

  const sortedEntries = [...entries].sort((a, b) => {
    const clientCmp = (a.client?.name ?? '').localeCompare(b.client?.name ?? '', 'it')
    if (clientCmp !== 0) return clientCmp
    const projectCmp = (a.project?.name ?? '').localeCompare(b.project?.name ?? '', 'it')
    if (projectCmp !== 0) return projectCmp
    const dateCmp = a.date.getTime() - b.date.getTime()
    if (dateCmp !== 0) return dateCmp
    return a.title.localeCompare(b.title, 'it')
  })

  // Calcola i totali giornalieri per determinare gli straordinari (> 480 min = 8h).
  const dayTotals = new Map<string, number>()
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10)
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + e.duration)
  }

  // Mantiene la logica storica: lo straordinario giornaliero viene emesso una sola volta,
  // sulla prima entry della giornata in ordine cronologico.
  const firstEntryIdByDay = new Map<string, string>()
  for (const e of entries) {
    const dateKey = e.date.toISOString().slice(0, 10)
    if (!firstEntryIdByDay.has(dateKey)) {
      firstEntryIdByDay.set(dateKey, e.id)
    }
  }

  const header = [
    'data',
    'titolo',
    'descrizione',
    'tipo_attivita',
    'durata_ore',
    'straordinari_ore',
    'cliente',
    'progetto',
    'tag',
  ]
  const rows: string[] = []
  const summaryMap = new Map<string, { client: string; project: string; totalHours: number; overtimeHours: number }>()

  for (const e of sortedEntries) {
    const tagStr = e.tags.map((t) => t.name).join(';')
    const dateKey = e.date.toISOString().slice(0, 10)
    const isFirst = firstEntryIdByDay.get(dateKey) === e.id
    const dayOt = Math.max(0, (dayTotals.get(dateKey) ?? 0) - 480)
    const overtimeHours = isFirst ? roundHours(dayOt / 60) : 0
    const overtimeVal = isFirst ? String(overtimeHours) : ''
    rows.push([
      csvCell(formatDateUtc(e.date)),
      csvCell(e.title),
      csvCell(e.description ?? ''),
      csvCell(activityTypeCsvLabel(e.activityType)),
      String(roundHours(e.duration / 60)),
      csvCell(overtimeVal),
      csvCell(e.client?.name ?? ''),
      csvCell(e.project?.name ?? ''),
      csvCell(tagStr),
    ].join(','))

    const clientName = e.client?.name ?? ''
    const projectName = e.project?.name ?? ''
    const summaryKey = `${clientName}\u0000${projectName}`
    const existing = summaryMap.get(summaryKey) ?? {
      client: clientName,
      project: projectName,
      totalHours: 0,
      overtimeHours: 0,
    }
    existing.totalHours += e.duration / 60
    existing.overtimeHours += overtimeHours
    summaryMap.set(summaryKey, existing)
  }

  const summaryHeader = ['cliente', 'progetto', 'totale_ore', 'straordinari_ore']
  const summaryRows = [...summaryMap.values()]
    .sort((a, b) => {
      const clientCmp = a.client.localeCompare(b.client, 'it')
      if (clientCmp !== 0) return clientCmp
      return a.project.localeCompare(b.project, 'it')
    })
    .map((item) =>
      [
        csvCell(item.client),
        csvCell(item.project),
        String(roundHours(item.totalHours)),
        String(roundHours(item.overtimeHours)),
      ].join(','),
    )

  const bom = '\uFEFF'
  const body = bom + [header.join(','), ...rows, '', summaryHeader.join(','), ...summaryRows].join('\n') + '\n'

  const filename = `timesheet-${year}-${String(month).padStart(2, '0')}.csv`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
