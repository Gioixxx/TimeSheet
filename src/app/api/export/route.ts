import { NextRequest } from 'next/server'
import type { ActivityType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function activityTypeCsvLabel(t: ActivityType): string {
  if (t === 'MANUTENZIONE') return 'manutenzione'
  if (t === 'PERMESSO') return 'permesso'
  if (t === 'FERIE') return 'ferie'
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
  return d.toISOString().slice(0, 10)
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

  const header = [
    'data',
    'titolo',
    'descrizione',
    'tipo_attivita',
    'durata_minuti',
    'cliente',
    'progetto',
    'tag',
  ]
  const rows = entries.map((e) => {
    const tagStr = e.tags.map((t) => t.name).join(';')
    return [
      csvCell(formatDateUtc(e.date)),
      csvCell(e.title),
      csvCell(e.description ?? ''),
      csvCell(activityTypeCsvLabel(e.activityType)),
      String(e.duration),
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
