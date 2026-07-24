import type { ExportDataset } from '@/lib/export-data'

function csvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

/** Serializza il dataset in CSV (UTF-8 con BOM), compatibile con Excel/LibreOffice. */
export function datasetToCsv(dataset: ExportDataset): string {
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

  const rows = dataset.rows.map((r) =>
    [
      csvCell(r.date),
      csvCell(r.title),
      csvCell(r.description),
      csvCell(r.activityType),
      String(r.hours),
      csvCell(r.overtimeHours === null ? '' : String(r.overtimeHours)),
      csvCell(r.client),
      csvCell(r.project),
      csvCell(r.tags),
    ].join(','),
  )

  const summaryHeader = ['cliente', 'progetto', 'tipo_attivita', 'totale_ore', 'straordinari_ore']
  const summaryRows = dataset.summary.map((s) =>
    [
      csvCell(s.client),
      csvCell(s.project),
      csvCell(s.activityType),
      String(s.totalHours),
      String(s.overtimeHours),
    ].join(','),
  )

  const totalRow = [
    csvCell('TOTALE'),
    '',
    '',
    String(dataset.grandTotal.totalHours),
    String(dataset.grandTotal.overtimeHours),
  ].join(',')

  const bom = String.fromCharCode(0xfeff)
  return (
    bom +
    [header.join(','), ...rows, '', summaryHeader.join(','), ...summaryRows, totalRow].join('\n') +
    '\n'
  )
}
