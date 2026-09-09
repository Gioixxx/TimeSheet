import ExcelJS from 'exceljs'
import type { ExportDataset } from '@/lib/export-data'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1D4ED8' }, // blue-700 (coerente con i design token)
}
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } }
const HOURS_FMT = '0.00'

function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = { vertical: 'middle' }
  })
}

/** Costruisce una cartella Excel (.xlsx) con foglio Dettaglio + Riepilogo, formattata. */
export async function datasetToXlsx(dataset: ExportDataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'TimeSheet'
  wb.created = new Date()

  // --- Foglio Dettaglio ---
  const detail = wb.addWorksheet('Dettaglio', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  detail.columns = [
    { header: 'Data', key: 'date', width: 12 },
    { header: 'Titolo', key: 'title', width: 32 },
    { header: 'Descrizione', key: 'description', width: 40 },
    { header: 'Tipo attività', key: 'activityType', width: 16 },
    { header: 'Durata (ore)', key: 'hours', width: 13, style: { numFmt: HOURS_FMT } },
    { header: 'Straordinari (ore)', key: 'overtimeHours', width: 17, style: { numFmt: HOURS_FMT } },
    { header: 'Cliente', key: 'client', width: 22 },
    { header: 'Progetto', key: 'project', width: 22 },
    { header: 'Tag', key: 'tags', width: 22 },
  ]
  styleHeaderRow(detail.getRow(1))
  for (const r of dataset.rows) {
    detail.addRow({
      date: r.date,
      title: r.title,
      description: r.description,
      activityType: r.activityType,
      hours: r.hours,
      overtimeHours: r.overtimeHours ?? null,
      client: r.client,
      project: r.project,
      tags: r.tags,
    })
  }
  detail.autoFilter = { from: 'A1', to: 'I1' }

  // --- Foglio Riepilogo ---
  const summary = wb.addWorksheet('Riepilogo', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  summary.columns = [
    { header: 'Cliente', key: 'client', width: 24 },
    { header: 'Progetto', key: 'project', width: 24 },
    { header: 'Tipo attività', key: 'activityType', width: 16 },
    { header: 'Totale ore', key: 'totalHours', width: 13, style: { numFmt: HOURS_FMT } },
    { header: 'Straordinari (ore)', key: 'overtimeHours', width: 17, style: { numFmt: HOURS_FMT } },
  ]
  styleHeaderRow(summary.getRow(1))
  for (const s of dataset.summary) {
    summary.addRow({
      client: s.client,
      project: s.project,
      activityType: s.activityType,
      totalHours: s.totalHours,
      overtimeHours: s.overtimeHours,
    })
  }
  const totalRow = summary.addRow({
    client: 'TOTALE',
    project: '',
    activityType: '',
    totalHours: dataset.grandTotal.totalHours,
    overtimeHours: dataset.grandTotal.overtimeHours,
  })
  totalRow.eachCell((cell) => {
    cell.font = { bold: true }
  })

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
