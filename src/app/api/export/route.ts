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

  // Calcola i totali giornalieri per determinare gli straordinari (> 480 min = 8h)
  const dayTotals = new Map<string, number>()
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10)
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + e.duration)
  }
  const dayOvertimeEmitted = new Set<string>()

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
  const rows = entries.map((e) => {
    const tagStr = e.tags.map((t) => t.name).join(';')
    const dateKey = e.date.toISOString().slice(0, 10)
    const isFirst = !dayOvertimeEmitted.has(dateKey)
    if (isFirst) dayOvertimeEmitted.add(dateKey)
    const dayOt = Math.max(0, (dayTotals.get(dateKey) ?? 0) - 480)
    const overtimeVal = isFirst ? String(Math.round((dayOt / 60) * 100) / 100) : ''
    return [
      csvCell(formatDateUtc(e.date)),
      csvCell(e.title),
      csvCell(e.description ?? ''),
      csvCell(activityTypeCsvLabel(e.activityType)),
      String(Math.round((e.duration / 60) * 100) / 100),
      csvCell(overtimeVal),
      csvCell(e.client?.name ?? ''),
      csvCell(e.project?.name ?? ''),
      csvCell(tagStr),
    ].join(',')
  })

  const bom = '\uFEFF'
  const body = bom + [header.join(','), ...rows].join('\n') + '\n'

  const filename = `timesheet-${year}-${String(month).padStart(2, '0')}.csv`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
