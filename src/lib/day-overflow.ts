import { ABSENCE_TYPES, MINUTES_PER_WORKDAY, type ActivityType } from './activity-types'
import { addDaysKey, isWorkingDay } from './holidays'

/**
 * Ore che superano la giornata lavorativa al momento di registrare una voce.
 *
 * Le ore *ordinarie* di un giorno sono tutte le voci tranne gli STRAORDINARIO: ferie e permessi
 * coprono la giornata come il lavoro, mentre lo straordinario per definizione sta fuori dalle 8h.
 * Contarlo farebbe scattare la domanda su ogni voce successiva dello stesso giorno, anche dopo
 * che l'utente ha già scelto di registrare l'eccedenza come straordinario.
 *
 * Funzioni pure: le ore già registrate arrivano dal chiamante come mappa giorno → minuti.
 */

export type OverflowChoice = 'STRAORDINARIO' | 'SPREAD'

export type DayChunk = { date: string; minutes: number }

/** Una voce da scrivere: la registrazione originale divisa secondo la scelta. */
export type EntryPart = { date: string; duration: number; activityType: ActivityType }

/** Quello che serve all'utente per scegliere. */
export type OverflowInfo = {
  date: string
  /** Ore ordinarie già presenti nel giorno, esclusa la voce in registrazione. */
  regularMinutes: number
  entryMinutes: number
  excessMinutes: number
  /** Dove finirebbe l'eccedenza scegliendo di spostarla. */
  spread: DayChunk[]
}

/** Oltre questo orizzonte la ricerca di giorni liberi si arrende invece di girare a vuoto. */
const MAX_SPREAD_DAYS = 366

/**
 * La domanda si pone solo per il lavoro: ferie e permessi non diventano straordinario, e uno
 * straordinario è già eccedenza per scelta.
 */
export function isOverflowChecked(type: ActivityType): boolean {
  return type !== 'STRAORDINARIO' && !ABSENCE_TYPES.includes(type)
}

/** Minuti della voce che non stanno nelle 8h ordinarie del giorno. */
export function excessMinutes(regularMinutes: number, duration: number): number {
  const capacity = Math.max(0, MINUTES_PER_WORKDAY - regularMinutes)
  return Math.max(0, duration - capacity)
}

/**
 * Distribuisce `minutes` sui giorni lavorativi successivi a `fromDate`, riempiendo ciascuno
 * fino alle 8h: se il primo non basta si prosegue con i seguenti. Weekend, festivi e giorni già
 * pieni vengono saltati.
 */
export function planSpread(
  minutes: number,
  fromDate: string,
  regularByDay: ReadonlyMap<string, number>,
): DayChunk[] {
  const chunks: DayChunk[] = []
  let left = minutes
  let day = fromDate
  for (let i = 0; left > 0 && i < MAX_SPREAD_DAYS; i++) {
    day = addDaysKey(day, 1)
    if (!isWorkingDay(day)) continue
    const free = Math.max(0, MINUTES_PER_WORKDAY - (regularByDay.get(day) ?? 0))
    if (free === 0) continue
    const take = Math.min(free, left)
    chunks.push({ date: day, minutes: take })
    left -= take
  }
  if (left > 0) {
    throw new Error('Nessun giorno lavorativo libero nei prossimi 12 mesi su cui spostare le ore.')
  }
  return chunks
}

/**
 * Divide la voce secondo la scelta. Se una parte resta nel giorno originale è la prima: in
 * modifica è quella che aggiorna la voce esistente.
 */
export function splitEntry(
  entry: EntryPart,
  regularMinutes: number,
  choice: OverflowChoice,
  regularByDay: ReadonlyMap<string, number>,
): EntryPart[] {
  const excess = excessMinutes(regularMinutes, entry.duration)
  if (excess === 0) return [entry]

  const parts: EntryPart[] = []
  const kept = entry.duration - excess
  if (kept > 0) parts.push({ ...entry, duration: kept })

  if (choice === 'STRAORDINARIO') {
    parts.push({ date: entry.date, duration: excess, activityType: 'STRAORDINARIO' })
  } else {
    for (const chunk of planSpread(excess, entry.date, regularByDay)) {
      parts.push({ date: chunk.date, duration: chunk.minutes, activityType: entry.activityType })
    }
  }
  return parts
}
