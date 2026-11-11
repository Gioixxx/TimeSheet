/**
 * Logica pura del riepilogo mensile (`/calendario/riepilogo`): niente accesso al database,
 * le voci arrivano dal chiamante.
 *
 * I numeri DEVONO coincidere con quelli di `/calendario` per lo stesso mese: le regole qui sotto
 * replicano quelle della pagina del calendario (ancora inline lì):
 *  - le ore lavorate sono tutte le voci tranne le FERIE (PERMESSO e STRAORDINARIO incluse);
 *  - le ferie contano solo nei giorni lavorativi, al massimo 8h per giorno, e riducono le ore
 *    attese (`attese = giorni lavorativi × 8h − ferie`);
 *  - lo straordinario è la somma di `max(0, totale giorno − 8h)`, dove il totale del giorno
 *    comprende anche le ferie;
 *  - giorno lavorativo = non sabato/domenica e non festività nazionale.
 *
 * I giorni sono chiavi `YYYY-MM-DD` lette in UTC, come le voci (vedi `dates.ts`).
 */

import { ACTIVITY_TYPES, MINUTES_PER_WORKDAY, type ActivityType } from './activity-types'
import { dateKeyUtc, italianHolidays } from './holidays'

/** Stessi limiti di `src/app/api/export/route.ts`. */
const MIN_YEAR = 1970
const MAX_YEAR = 2100

const MONTH_PARAM_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

const pad = (n: number) => String(n).padStart(2, '0')

export type YearMonth = { year: number; month: number }

/** Il minimo che serve a una voce per essere riepilogata. */
export type SummaryEntryBase = {
  date: Date
  duration: number
  activityType: ActivityType
}

/** Una voce così come la mostra il riepilogo (forma di `timeEntry` con client, progetto e tag). */
export type SummaryEntry = SummaryEntryBase & {
  id: string
  title: string
  description: string | null
  client: { name: string } | null
  project: { name: string } | null
  tags: { id: string; name: string }[]
}

export type DaySummary<E extends SummaryEntryBase> = {
  /** `YYYY-MM-DD` */
  key: string
  day: number
  /** 0 = domenica … 6 = sabato (UTC). */
  weekday: number
  isWeekend: boolean
  isHoliday: boolean
  /** Sabato, domenica e festivi sono ciò che il calendario chiama non lavorativo. */
  isWorkingDay: boolean
  isToday: boolean
  isFuture: boolean
  entries: E[]
  /** Tutte le voci, ferie comprese (come la cella del calendario). */
  totalMinutes: number
  /** Eccedenza sulle 8h, ferie comprese nel totale (come la cella del calendario). */
  overtimeMinutes: number
  /** `totale − 8h`, solo per un giorno lavorativo con voci; altrimenti `null`. */
  deltaMinutes: number | null
  /** Giorno lavorativo passato senza alcuna voce. */
  missing: boolean
}

export type MonthTotals = {
  workedMinutes: number
  expectedMinutes: number
  workingDays: number
  /** Giorni di ferie su giorni lavorativi (anche frazionari). */
  ferieDays: number
  /** 0 se le ore attese sono zero. */
  progressPct: number
  overtimeMinutes: number
  /** Minuti per tipo, tutti i tipi presenti (anche a zero). */
  byType: Record<ActivityType, number>
  missingDays: string[]
}

export type MonthSummary<E extends SummaryEntryBase> = {
  days: DaySummary<E>[]
  totals: MonthTotals
}

/** `YYYY-MM` da anno e mese. */
export function formatMonthParam({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`
}

/**
 * Legge il parametro `?month=YYYY-MM`. Qualsiasi valore non valido (assente, formato errato,
 * mese 13, anno fuori da 1970-2100) ricade sul mese di `todayIso` (`YYYY-MM-DD`).
 */
export function parseMonthParam(raw: string | undefined, todayIso: string): YearMonth {
  const match = raw === undefined ? null : MONTH_PARAM_RE.exec(raw)
  if (match) {
    const year = Number(match[1])
    if (year >= MIN_YEAR && year <= MAX_YEAR) return { year, month: Number(match[2]) }
  }
  return { year: Number(todayIso.slice(0, 4)), month: Number(todayIso.slice(5, 7)) }
}

/** Finestra `[start, end)` del mese a mezzanotte UTC: il limite superiore è escluso. */
export function monthRangeUtc(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  }
}

/** Mese `delta` mesi dopo (negativo: prima), con il passaggio d'anno. */
export function shiftMonth(year: number, month: number, delta: number): YearMonth {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

function emptyByType(): Record<ActivityType, number> {
  const byType = {} as Record<ActivityType, number>
  for (const type of ACTIVITY_TYPES) byType[type] = 0
  return byType
}

/**
 * Riepilogo di un mese: un elemento per ogni giorno (anche vuoto) più i totali.
 * `entries` può contenere voci di altri mesi: vengono ignorate. `todayKey` è il giorno corrente
 * in fuso locale (`todayLocalIso()`).
 */
export function buildMonthSummary<E extends SummaryEntryBase>(
  entries: readonly E[],
  year: number,
  month: number,
  todayKey: string,
): MonthSummary<E> {
  const holidays = italianHolidays(year)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const days: DaySummary<E>[] = []
  const byKey = new Map<string, DaySummary<E>>()
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${pad(month)}-${pad(d)}`
    const weekday = new Date(Date.UTC(year, month - 1, d)).getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const isHoliday = holidays.has(key)
    const summary: DaySummary<E> = {
      key,
      day: d,
      weekday,
      isWeekend,
      isHoliday,
      isWorkingDay: !isWeekend && !isHoliday,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      entries: [],
      totalMinutes: 0,
      overtimeMinutes: 0,
      deltaMinutes: null,
      missing: false,
    }
    days.push(summary)
    byKey.set(key, summary)
  }

  const byType = emptyByType()
  const ferieByDay = new Map<string, number>()
  let workedMinutes = 0

  for (const entry of entries) {
    const day = byKey.get(dateKeyUtc(entry.date))
    if (!day) continue
    day.entries.push(entry)
    day.totalMinutes += entry.duration
    byType[entry.activityType] += entry.duration
    if (entry.activityType === 'FERIE') {
      ferieByDay.set(day.key, (ferieByDay.get(day.key) ?? 0) + entry.duration)
    } else {
      workedMinutes += entry.duration
    }
  }

  let workingDays = 0
  let overtimeMinutes = 0
  const missingDays: string[] = []
  for (const day of days) {
    if (day.isWorkingDay) workingDays++
    day.overtimeMinutes = Math.max(0, day.totalMinutes - MINUTES_PER_WORKDAY)
    overtimeMinutes += day.overtimeMinutes
    if (day.isWorkingDay && day.totalMinutes > 0) day.deltaMinutes = day.totalMinutes - MINUTES_PER_WORKDAY
    day.missing = day.isWorkingDay && day.key < todayKey && day.totalMinutes === 0
    if (day.missing) missingDays.push(day.key)
  }

  // Solo le ferie su un giorno lavorativo scalano le ore attese, al massimo 8h per giorno.
  let ferieMinutes = 0
  for (const [key, minutes] of ferieByDay) {
    if (byKey.get(key)?.isWorkingDay) ferieMinutes += Math.min(minutes, MINUTES_PER_WORKDAY)
  }

  const expectedMinutes = Math.max(0, workingDays * MINUTES_PER_WORKDAY - ferieMinutes)

  return {
    days,
    totals: {
      workedMinutes,
      expectedMinutes,
      workingDays,
      ferieDays: ferieMinutes / MINUTES_PER_WORKDAY,
      progressPct: expectedMinutes > 0 ? Math.round((workedMinutes / expectedMinutes) * 100) : 0,
      overtimeMinutes,
      byType,
      missingDays,
    },
  }
}
