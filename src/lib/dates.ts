/**
 * Helper per le date del dominio TimeSheet.
 *
 * Convenzione di storage: una voce di timesheet è una data *calendariale*, salvata come
 * mezzanotte UTC (`new Date('2026-09-09')` → `2026-09-09T00:00:00.000Z`). Le finestre di
 * ricerca vanno quindi ancorate a mezzanotte UTC, mentre il giorno "corrente" va letto nel
 * fuso dell'utente: da qui la coppia "leggi il giorno in locale, costruiscilo in UTC".
 *
 * Il fuso del processo server deve coincidere con quello dell'utente (`TZ` nel Dockerfile),
 * altrimenti server e client calcolano due giorni diversi.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Data odierna nel fuso locale, in formato `YYYY-MM-DD`. */
export function todayLocalIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Finestra `[start, end)` del giorno locale corrente, ancorata a mezzanotte UTC —
 * allineata al modo in cui le voci sono salvate.
 */
export function localDayRangeUtc(now: Date = new Date()): { start: Date; end: Date } {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  return {
    start: new Date(Date.UTC(y, m, d)),
    end: new Date(Date.UTC(y, m, d + 1)),
  }
}

/**
 * Finestra `[start, end)` della settimana ISO che contiene il giorno locale corrente
 * (lunedì → lunedì successivo), a mezzanotte UTC. ISO: la settimana inizia di lunedì, come
 * nel calendario e nel resto dell'app.
 *
 * Il limite superiore serve: con il solo `gte` la card "Questa settimana" sommava anche le
 * voci datate nelle settimane successive.
 */
export function isoWeekRangeUtc(now: Date = new Date()): { start: Date; end: Date } {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  // getDay(): 0 = domenica … 6 = sabato → offset dal lunedì
  const daysSinceMonday = (now.getDay() + 6) % 7
  return {
    start: new Date(Date.UTC(y, m, d - daysSinceMonday)),
    end: new Date(Date.UTC(y, m, d - daysSinceMonday + 7)),
  }
}
