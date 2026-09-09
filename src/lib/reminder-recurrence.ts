export type RecurrenceRule = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

const RECURRENCE_RULES: readonly RecurrenceRule[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

/**
 * Normalizza il campo `recurrence`, che a schema è una stringa libera.
 * Un valore non riconosciuto (scrittura diretta su SQLite, migrazione futura) viene trattato
 * come "non ricorrente": senza questo controllo i cicli di avanzamento non terminerebbero mai.
 */
export function parseRecurrenceRule(value: string | null | undefined): RecurrenceRule | null {
  if (!value) return null
  return RECURRENCE_RULES.includes(value as RecurrenceRule) ? (value as RecurrenceRule) : null
}

export type ReminderRecurrenceData = {
  scheduledAt: Date
  recurrence: string | null
  recurrenceEnd: Date | null
  notifiedAt: Date | null
}

/** Ultimo giorno del mese `month` (0-based) dell'anno `year` */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Avanza una data di un'unità in base alla regola di ricorrenza.
 *
 * Per MONTHLY e YEARLY la data di destinazione viene *saturata* all'ultimo giorno del mese:
 * `setMonth` da solo normalizzerebbe il 31 gennaio in 3 marzo. `anchorDay` è il giorno del mese
 * della data di partenza della serie: senza di esso la saturazione introdurrebbe comunque una
 * deriva permanente (31 gen → 28 feb → 28 mar), perché ogni passo ripartirebbe dalla data
 * già saturata. Con l'ancora la serie torna al 31 non appena il mese lo consente.
 */
export function advanceByRecurrence(date: Date, rule: RecurrenceRule, anchorDay?: number): Date {
  const d = new Date(date)
  const targetDay = anchorDay ?? d.getDate()
  switch (rule) {
    case 'DAILY':
      d.setDate(d.getDate() + 1)
      break
    case 'WEEKLY':
      d.setDate(d.getDate() + 7)
      break
    case 'MONTHLY':
      d.setDate(1)
      d.setMonth(d.getMonth() + 1)
      d.setDate(Math.min(targetDay, lastDayOfMonth(d.getFullYear(), d.getMonth())))
      break
    case 'YEARLY':
      d.setDate(1)
      d.setFullYear(d.getFullYear() + 1)
      d.setDate(Math.min(targetDay, lastDayOfMonth(d.getFullYear(), d.getMonth())))
      break
  }
  return d
}

/**
 * Calcola la prossima occorrenza da notificare per un reminder.
 * - Per reminder non ricorrenti: restituisce scheduledAt se non ancora notificato, null altrimenti.
 * - Per reminder ricorrenti: avanza scheduledAt fino alla prima data > notifiedAt.
 *   Restituisce null se oltre recurrenceEnd.
 */
export function nextOccurrence(r: ReminderRecurrenceData): Date | null {
  const rule = parseRecurrenceRule(r.recurrence)

  // Non ricorrente
  if (!rule) {
    return r.notifiedAt ? null : new Date(r.scheduledAt)
  }

  const baseline = r.notifiedAt ?? new Date(0)
  const anchorDay = new Date(r.scheduledAt).getDate()
  let date = new Date(r.scheduledAt)

  // Avanza fino alla prima occorrenza successiva al baseline
  while (date <= baseline) {
    date = advanceByRecurrence(date, rule, anchorDay)
    if (r.recurrenceEnd && date > r.recurrenceEnd) return null
  }

  return date
}

/** Limite di sicurezza sui cicli di avanzamento (≈27 anni di ricorrenza giornaliera). */
const MAX_ADVANCE_STEPS = 10_000

/**
 * Occorrenza *rilevante adesso*, per la visualizzazione in lista.
 *
 * Diversa da `nextOccurrence`, che risponde a "quale occorrenza devo ancora notificare" e
 * quindi parte da `notifiedAt`: un reminder giornaliero mai notificato le farebbe restituire
 * la data di creazione, e la lista mostrerebbe "18 ago" per sempre. Qui si restituisce invece
 * l'ultima occorrenza già dovuta (quella che l'utente deve spuntare oggi) o, se la serie non è
 * ancora iniziata, la prima futura.
 */
export function currentOccurrence(r: ReminderRecurrenceData, now: Date = new Date()): Date | null {
  const rule = parseRecurrenceRule(r.recurrence)

  if (!rule) return new Date(r.scheduledAt)

  let date = new Date(r.scheduledAt)
  if (date > now) return date

  const anchorDay = date.getDate()
  for (let i = 0; i < MAX_ADVANCE_STEPS; i++) {
    const next = advanceByRecurrence(date, rule, anchorDay)
    if (next > now) break
    if (r.recurrenceEnd && next > r.recurrenceEnd) break
    date = next
  }

  return date
}

/**
 * Restituisce tutte le occorrenze di un reminder che cadono nell'intervallo [rangeStart, rangeEnd).
 * Usato per mostrare i reminder sul calendario.
 */
export function getOccurrencesInRange(
  r: ReminderRecurrenceData,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const rule = parseRecurrenceRule(r.recurrence)
  const occurrences: Date[] = []

  if (!rule) {
    if (r.scheduledAt >= rangeStart && r.scheduledAt < rangeEnd) {
      occurrences.push(new Date(r.scheduledAt))
    }
    return occurrences
  }

  const anchorDay = new Date(r.scheduledAt).getDate()
  let date = new Date(r.scheduledAt)

  // Porta la data all'interno o subito prima del range
  if (date < rangeStart) {
    while (date < rangeStart) {
      const next = advanceByRecurrence(date, rule, anchorDay)
      if (r.recurrenceEnd && next > r.recurrenceEnd) return occurrences
      date = next
    }
  }

  // Raccoglie tutte le occorrenze nel range
  while (date < rangeEnd) {
    if (!r.recurrenceEnd || date <= r.recurrenceEnd) {
      occurrences.push(new Date(date))
    }
    date = advanceByRecurrence(date, rule, anchorDay)
    if (r.recurrenceEnd && date > r.recurrenceEnd) break
  }

  return occurrences
}

/** Etichetta leggibile per la regola di ricorrenza */
export function recurrenceLabel(rule: string | null): string {
  switch (rule) {
    case 'DAILY':   return 'Ogni giorno'
    case 'WEEKLY':  return 'Ogni settimana'
    case 'MONTHLY': return 'Ogni mese'
    case 'YEARLY':  return 'Ogni anno'
    default:        return ''
  }
}
