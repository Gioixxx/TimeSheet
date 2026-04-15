export type RecurrenceRule = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export type ReminderRecurrenceData = {
  scheduledAt: Date
  recurrence: string | null
  recurrenceEnd: Date | null
  notifiedAt: Date | null
}

/** Avanza una data di un'unità in base alla regola di ricorrenza */
export function advanceByRecurrence(date: Date, rule: RecurrenceRule): Date {
  const d = new Date(date)
  switch (rule) {
    case 'DAILY':
      d.setDate(d.getDate() + 1)
      break
    case 'WEEKLY':
      d.setDate(d.getDate() + 7)
      break
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1)
      break
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1)
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
  const rule = r.recurrence as RecurrenceRule | null

  // Non ricorrente
  if (!rule) {
    return r.notifiedAt ? null : new Date(r.scheduledAt)
  }

  const baseline = r.notifiedAt ?? new Date(0)
  let date = new Date(r.scheduledAt)

  // Avanza fino alla prima occorrenza successiva al baseline
  while (date <= baseline) {
    date = advanceByRecurrence(date, rule)
    if (r.recurrenceEnd && date > r.recurrenceEnd) return null
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
  const rule = r.recurrence as RecurrenceRule | null
  const occurrences: Date[] = []

  if (!rule) {
    if (r.scheduledAt >= rangeStart && r.scheduledAt < rangeEnd) {
      occurrences.push(new Date(r.scheduledAt))
    }
    return occurrences
  }

  let date = new Date(r.scheduledAt)

  // Porta la data all'interno o subito prima del range
  if (date < rangeStart) {
    while (date < rangeStart) {
      const next = advanceByRecurrence(date, rule)
      if (r.recurrenceEnd && next > r.recurrenceEnd) return occurrences
      date = next
    }
  }

  // Raccoglie tutte le occorrenze nel range
  while (date < rangeEnd) {
    if (!r.recurrenceEnd || date <= r.recurrenceEnd) {
      occurrences.push(new Date(date))
    }
    date = advanceByRecurrence(date, rule)
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
