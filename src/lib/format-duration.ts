/**
 * Formattazione di durate, giorni e nomi di mesi per la vista riepilogo mensile.
 *
 * Un solo posto per il codice nuovo: le stesse funzioni esistono duplicate in altre pagine e
 * componenti (calendario, giorno, oggi, lista), che per ora restano come sono.
 */

import { MINUTES_PER_WORKDAY, type ActivityType } from './activity-types'

export const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
] as const

/** Indice = `getUTCDay()`: 0 è domenica. */
export const WEEKDAY_NAMES_IT = [
  'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato',
] as const

/** Tre lettere, indice = `getUTCDay()`. */
export const WEEKDAY_SHORT_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'] as const

/** Giorni (anche frazionari, per le mezze giornate di ferie): `1`, `0.5`. */
export function formatDays(days: number): string {
  return Number.isInteger(days) ? `${days}` : days.toFixed(1)
}

/** Minuti come `3h`, `4h30`, `30m`; con tipo FERIE in giorni di lavoro (`1g`). Zero → `0h`. */
export function formatDuration(minutes: number, activityType?: ActivityType): string {
  if (activityType === 'FERIE') return `${formatDays(minutes / MINUTES_PER_WORKDAY)}g`
  if (minutes <= 0) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Scarto con il segno: `+2h`, `-30m`, `0h`. */
export function formatSigned(minutes: number): string {
  if (minutes === 0) return '0h'
  return `${minutes > 0 ? '+' : '-'}${formatDuration(Math.abs(minutes))}`
}
