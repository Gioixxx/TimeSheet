import ExcelJS from 'exceljs'
import type { ActivityType } from '@prisma/client'
import {
  ABSENCE_TYPES,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  MINUTES_PER_WORKDAY,
} from '@/lib/activity-types'
import { roundHours, type ExportDataset } from '@/lib/export-data'

const BLUE = 'FF1D4ED8' // blue-700 (coerente con i design token)
const BLUE_LIGHT = 'FFDBEAFE' // blue-100, per i subtotali
const GREY_TEXT = 'FF6B7280'
const GREY_BORDER = 'FFD1D5DB'
const HOURS_FMT = '#,##0.00'
const HOURS_PER_WORKDAY = MINUTES_PER_WORKDAY / 60

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const WEEKDAYS_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

const NO_CLIENT = '(senza cliente)'
const NO_PROJECT = '(senza progetto)'

const THIN_TOP: Partial<ExcelJS.Borders> = { top: { style: 'thin', color: { argb: GREY_BORDER } } }

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function isAbsence(type: ActivityType): boolean {
  return ABSENCE_TYPES.includes(type)
}

function sumHours(values: number[]): number {
  return roundHours(values.reduce((acc, v) => acc + v, 0))
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Applica `apply` a ogni cella da 1 a `lastCol`, anche se vuota (eachCell salterebbe quelle vuote). */
function forEachCell(row: ExcelJS.Row, lastCol: number, apply: (cell: ExcelJS.Cell) => void): void {
  for (let c = 1; c <= lastCol; c++) apply(row.getCell(c))
}

function styleHeaderRow(row: ExcelJS.Row, lastCol: number, firstNumericCol: number): void {
  row.height = 20
  forEachCell(row, lastCol, (cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = solidFill(BLUE)
    cell.alignment = {
      vertical: 'middle',
      horizontal: Number(cell.col) >= firstNumericCol ? 'right' : 'left',
    }
  })
}

function formatHoursColumns(row: ExcelJS.Row, fromCol: number, toCol: number): void {
  for (let c = fromCol; c <= toCol; c++) row.getCell(c).numFmt = HOURS_FMT
}

function describeFilters(filters: ExportDataset['filters']): string {
  const parts: string[] = []
  if (filters.client) parts.push(`cliente ${filters.client}`)
  if (filters.type) parts.push(`tipo ${ACTIVITY_TYPE_LABELS[filters.type].toLowerCase()}`)
  return parts.length > 0 ? `Filtri: ${parts.join(' · ')}` : 'Tutti i clienti e i tipi di attività'
}

function formatToday(): string {
  const d = new Date()
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

type ProjectLine = { project: string; hours: Map<ActivityType, number> }
type ClientGroup = { client: string; projects: ProjectLine[] }

/** Raggruppa il riepilogo (già ordinato cliente → progetto) in cliente → progetto → ore per tipo. */
function groupWorkByClient(summary: ExportDataset['summary']): ClientGroup[] {
  const groups: ClientGroup[] = []
  for (const s of summary) {
    if (isAbsence(s.activityTypeKey)) continue
    let group = groups[groups.length - 1]
    if (!group || group.client !== s.client) {
      group = { client: s.client, projects: [] }
      groups.push(group)
    }
    let line = group.projects[group.projects.length - 1]
    if (!line || line.project !== s.project) {
      line = { project: s.project, hours: new Map() }
      group.projects.push(line)
    }
    line.hours.set(s.activityTypeKey, s.totalHours)
  }
  return groups
}

/**
 * Foglio Riepilogo: tabella a doppia entrata cliente/progetto × tipo attività, con subtotale per
 * cliente, le assenze (ferie/permessi) in una sezione a parte e il totale del mese in fondo.
 * Subtotali e totali sono la somma delle celle visibili, così tornano sempre a chi li ricontrolla.
 */
function addSummarySheet(wb: ExcelJS.Workbook, dataset: ExportDataset): void {
  const ws = wb.addWorksheet('Riepilogo', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const workTypes = ACTIVITY_TYPES.filter(
    (t) => !isAbsence(t) && dataset.summary.some((s) => s.activityTypeKey === t),
  )
  const firstTypeCol = 3
  const totalCol = firstTypeCol + workTypes.length
  const blanks = workTypes.map(() => null)

  ws.getColumn(1).width = 26
  ws.getColumn(2).width = 30
  for (let c = firstTypeCol; c < totalCol; c++) ws.getColumn(c).width = 14
  ws.getColumn(totalCol).width = 12

  const title = ws.addRow([`Timesheet · ${MONTHS_IT[dataset.period.month - 1]} ${dataset.period.year}`])
  ws.mergeCells(title.number, 1, title.number, totalCol)
  title.height = 24
  title.getCell(1).font = { bold: true, size: 14 }

  const subtitle = ws.addRow([`${describeFilters(dataset.filters)} · generato il ${formatToday()}`])
  ws.mergeCells(subtitle.number, 1, subtitle.number, totalCol)
  subtitle.getCell(1).font = { italic: true, size: 9, color: { argb: GREY_TEXT } }
  ws.addRow([])

  const addSectionTitle = (text: string) => {
    const row = ws.addRow([text.toUpperCase()])
    row.getCell(1).font = { bold: true, size: 10, color: { argb: BLUE } }
  }

  // --- Ore lavorate ---
  const groups = groupWorkByClient(dataset.summary)
  let workTotal = 0
  if (groups.length > 0) {
    addSectionTitle('Ore lavorate')
    styleHeaderRow(
      ws.addRow(['Cliente', 'Progetto', ...workTypes.map((t) => ACTIVITY_TYPE_LABELS[t]), 'Totale']),
      totalCol,
      firstTypeCol,
    )

    const typeTotals = new Map<ActivityType, number>()
    groups.forEach((group, groupIndex) => {
      const clientTotals = new Map<ActivityType, number>()
      group.projects.forEach((line, lineIndex) => {
        const row = ws.addRow([
          lineIndex === 0 ? group.client || NO_CLIENT : '',
          line.project || NO_PROJECT,
          ...workTypes.map((t) => line.hours.get(t) ?? null),
          sumHours([...line.hours.values()]),
        ])
        formatHoursColumns(row, firstTypeCol, totalCol)
        row.getCell(totalCol).font = { bold: true }
        if (lineIndex === 0) {
          row.getCell(1).font = group.client
            ? { bold: true }
            : { bold: true, italic: true, color: { argb: GREY_TEXT } }
          // Linea sottile di separazione fra un cliente e il successivo.
          if (groupIndex > 0) forEachCell(row, totalCol, (cell) => { cell.border = THIN_TOP })
        }
        if (!line.project) row.getCell(2).font = { italic: true, color: { argb: GREY_TEXT } }
        for (const [t, h] of line.hours) clientTotals.set(t, (clientTotals.get(t) ?? 0) + h)
      })

      const clientTotal = sumHours([...clientTotals.values()])
      // Il subtotale serve solo quando il cliente ha più progetti: con uno solo ripeterebbe la riga.
      if (group.projects.length > 1) {
        const row = ws.addRow([
          `Totale ${group.client || NO_CLIENT}`,
          '',
          ...workTypes.map((t) => (clientTotals.has(t) ? roundHours(clientTotals.get(t)!) : null)),
          clientTotal,
        ])
        formatHoursColumns(row, firstTypeCol, totalCol)
        forEachCell(row, totalCol, (cell) => {
          cell.font = { bold: true }
          cell.fill = solidFill(BLUE_LIGHT)
        })
      }
      for (const [t, h] of clientTotals) typeTotals.set(t, (typeTotals.get(t) ?? 0) + h)
      workTotal += clientTotal
    })
    workTotal = roundHours(workTotal)

    const row = ws.addRow([
      'Totale ore lavorate',
      '',
      ...workTypes.map((t) => roundHours(typeTotals.get(t) ?? 0)),
      workTotal,
    ])
    formatHoursColumns(row, firstTypeCol, totalCol)
    forEachCell(row, totalCol, (cell) => {
      cell.font = { bold: true }
      cell.border = { top: { style: 'medium', color: { argb: BLUE } } }
    })
    ws.addRow([])
  }

  // --- Assenze ---
  const absenceHours = new Map<ActivityType, number>()
  for (const s of dataset.summary) {
    if (!isAbsence(s.activityTypeKey)) continue
    absenceHours.set(s.activityTypeKey, (absenceHours.get(s.activityTypeKey) ?? 0) + s.totalHours)
  }
  const absenceTypes = ABSENCE_TYPES.filter((t) => absenceHours.has(t))
  let absenceTotal = 0
  if (absenceTypes.length > 0) {
    addSectionTitle('Assenze')
    styleHeaderRow(ws.addRow(['Tipo', 'Giorni', ...blanks, 'Ore']), totalCol, totalCol)
    for (const t of absenceTypes) {
      const hours = roundHours(absenceHours.get(t)!)
      // Le ferie si contano a giornate, i permessi a ore: "0,31 giorni" di permesso non dice nulla.
      const days = t === 'FERIE' ? roundHours(hours / HOURS_PER_WORKDAY) : null
      const row = ws.addRow([ACTIVITY_TYPE_LABELS[t], days, ...blanks, hours])
      row.getCell(2).alignment = { horizontal: 'left' }
      row.getCell(totalCol).numFmt = HOURS_FMT
      row.getCell(totalCol).font = { bold: true }
      absenceTotal += hours
    }
    absenceTotal = roundHours(absenceTotal)
    if (absenceTypes.length > 1) {
      const row = ws.addRow(['Totale assenze', null, ...blanks, absenceTotal])
      row.getCell(totalCol).numFmt = HOURS_FMT
      forEachCell(row, totalCol, (cell) => {
        cell.font = { bold: true }
        cell.border = { top: { style: 'medium', color: { argb: BLUE } } }
      })
    }
    ws.addRow([])
  }

  if (groups.length === 0 && absenceTypes.length === 0) {
    const row = ws.addRow(['Nessuna voce registrata nel periodo selezionato.'])
    row.getCell(1).font = { italic: true, color: { argb: GREY_TEXT } }
    return
  }

  // --- Totale mese ---
  const monthRow = ws.addRow(['Totale mese', '', ...blanks, roundHours(workTotal + absenceTotal)])
  monthRow.height = 20
  monthRow.getCell(totalCol).numFmt = HOURS_FMT
  forEachCell(monthRow, totalCol, (cell) => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    cell.fill = solidFill(BLUE)
    cell.alignment = { vertical: 'middle' }
  })

  const overtimeRow = ws.addRow([
    `Straordinari (oltre ${HOURS_PER_WORKDAY} h/giorno)`,
    '',
    ...blanks,
    dataset.grandTotal.overtimeHours,
  ])
  overtimeRow.getCell(totalCol).numFmt = HOURS_FMT
  overtimeRow.getCell(1).font = { color: { argb: GREY_TEXT } }
}

/** Foglio Dettaglio: una riga per voce, con date vere (ordinabili/filtrabili) e totale che segue i filtri. */
function addDetailSheet(wb: ExcelJS.Workbook, dataset: ExportDataset): void {
  const ws = wb.addWorksheet('Dettaglio', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ws.columns = [
    { header: 'Data', key: 'date', width: 11, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Giorno', key: 'weekday', width: 8 },
    { header: 'Cliente', key: 'client', width: 20 },
    { header: 'Progetto', key: 'project', width: 24 },
    { header: 'Tipo', key: 'activityType', width: 14 },
    { header: 'Titolo', key: 'title', width: 32 },
    { header: 'Descrizione', key: 'description', width: 48 },
    { header: 'Ore', key: 'hours', width: 9, style: { numFmt: HOURS_FMT } },
    { header: 'Straordinari', key: 'overtimeHours', width: 13, style: { numFmt: HOURS_FMT } },
    { header: 'Tag', key: 'tags', width: 20 },
  ]
  const lastCol = ws.columns.length
  const hoursCol = 8
  const overtimeCol = 9
  styleHeaderRow(ws.getRow(1), lastCol, hoursCol)
  // L'header numerico è a destra, ma "Tag" dopo le ore torna a sinistra.
  ws.getRow(1).getCell(lastCol).alignment = { vertical: 'middle', horizontal: 'left' }

  let previousClient: string | null = null
  for (const r of dataset.rows) {
    const [year, month, day] = r.isoDate.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    const row = ws.addRow({
      date,
      weekday: WEEKDAYS_IT[date.getUTCDay()],
      client: r.client,
      project: r.project,
      activityType: ACTIVITY_TYPE_LABELS[r.activityTypeKey],
      title: r.title,
      description: r.description,
      hours: r.hours,
      overtimeHours: r.overtimeHours || null, // niente "0,00" di rumore
      tags: r.tags.split(';').filter(Boolean).join(', '),
    })
    row.alignment = { vertical: 'top' }
    row.getCell('date').alignment = { vertical: 'top', horizontal: 'left' }
    row.getCell('title').alignment = { vertical: 'top', wrapText: true }
    row.getCell('description').alignment = { vertical: 'top', wrapText: true }
    if (previousClient !== null && r.client !== previousClient) {
      forEachCell(row, lastCol, (cell) => { cell.border = THIN_TOP })
    }
    previousClient = r.client
  }

  if (dataset.rows.length === 0) return

  const lastDataRow = ws.rowCount
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: lastDataRow, column: lastCol } }

  // Riga vuota prima del totale: tiene il totale fuori dall'area di filtro/ordinamento.
  ws.addRow([])
  const hoursLetter = ws.getColumn(hoursCol).letter
  const overtimeLetter = ws.getColumn(overtimeCol).letter
  const totalRow = ws.addRow({
    date: 'Totale',
    // SUBTOTAL(109, …) somma solo le righe visibili: il totale segue i filtri applicati.
    hours: {
      formula: `SUBTOTAL(109,${hoursLetter}2:${hoursLetter}${lastDataRow})`,
      result: sumHours(dataset.rows.map((r) => r.hours)),
    },
    overtimeHours: {
      formula: `SUBTOTAL(109,${overtimeLetter}2:${overtimeLetter}${lastDataRow})`,
      result: sumHours(dataset.rows.map((r) => r.overtimeHours ?? 0)),
    },
  })
  forEachCell(totalRow, lastCol, (cell) => {
    cell.font = { bold: true }
    cell.border = { top: { style: 'medium', color: { argb: BLUE } } }
  })
}

/** Costruisce una cartella Excel (.xlsx) con fogli Riepilogo (aperto per primo) e Dettaglio. */
export async function datasetToXlsx(dataset: ExportDataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'TimeSheet'
  wb.created = new Date()

  addSummarySheet(wb, dataset)
  addDetailSheet(wb, dataset)

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
