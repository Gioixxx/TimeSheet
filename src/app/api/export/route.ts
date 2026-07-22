import { NextRequest } from 'next/server'
import type { ActivityType } from '@prisma/client'
import { requireApiAuth } from '@/lib/dal'
import { buildExportDataset } from '@/lib/export-data'
import { datasetToCsv } from '@/lib/export-csv'
import { datasetToXlsx } from '@/lib/export-xlsx'

const ACTIVITY_TYPES: ActivityType[] = [
  'SUPPORTO',
  'MANUTENZIONE',
  'PERMESSO',
  'FERIE',
  'STRAORDINARIO',
]

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function GET(request: NextRequest) {
  const unauthorized = await requireApiAuth()
  if (unauthorized) return unauthorized

  const params = request.nextUrl.searchParams
  const yearStr = params.get('year')
  const monthStr = params.get('month')

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

  const format = params.get('format') === 'xlsx' ? 'xlsx' : 'csv'

  const typeParam = params.get('type')
  const type =
    typeParam && ACTIVITY_TYPES.includes(typeParam as ActivityType)
      ? (typeParam as ActivityType)
      : null

  const clientParam = params.get('client')
  const client = clientParam && clientParam.trim() !== '' ? clientParam : null

  const dataset = await buildExportDataset({ year, month, type, client })

  const baseName = `timesheet-${year}-${String(month).padStart(2, '0')}`

  if (format === 'xlsx') {
    const buffer = await datasetToXlsx(dataset)
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': XLSX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
      },
    })
  }

  const body = datasetToCsv(dataset)
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${baseName}.csv"`,
    },
  })
}
