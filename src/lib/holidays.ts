/**
 * Giorni lavorativi del calendario italiano: sabato, domenica e festività nazionali esclusi.
 *
 * I giorni sono chiavi `YYYY-MM-DD` lette in UTC, come le voci del timesheet (vedi `dates.ts`).
 * Estratto dalla pagina del calendario perché serve anche a spostare le ore eccedenti sui
 * giorni lavorativi successivi.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Chiave `YYYY-MM-DD` di una data salvata a mezzanotte UTC. */
export function dateKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Chiave del giorno `days` giorni dopo `key` (negativo per andare indietro). */
export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return dateKeyUtc(d)
}

// Calcola la data di Pasqua (algoritmo anonimo gregoriano)
function easterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

export function italianHolidays(year: number): Set<string> {
  const fixed = [
    `${year}-01-01`, // Capodanno
    `${year}-01-06`, // Epifania
    `${year}-04-25`, // Liberazione
    `${year}-05-01`, // Festa dei Lavoratori
    `${year}-06-02`, // Festa della Repubblica
    `${year}-08-15`, // Ferragosto
    `${year}-11-01`, // Ognissanti
    `${year}-12-08`, // Immacolata Concezione
    `${year}-12-25`, // Natale
    `${year}-12-26`, // Santo Stefano
  ]
  const lunediDellAngelo = new Date(easterDate(year))
  lunediDellAngelo.setUTCDate(lunediDellAngelo.getUTCDate() + 1)
  return new Set([...fixed, dateKeyUtc(lunediDellAngelo)])
}

/** Vero se il giorno non è sabato, domenica o una festività nazionale. */
export function isWorkingDay(key: string): boolean {
  const d = new Date(`${key}T00:00:00Z`)
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return false
  return !italianHolidays(d.getUTCFullYear()).has(key)
}
