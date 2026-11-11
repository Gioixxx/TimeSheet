import { describe, expect, it } from 'vitest'
import type { ActivityType } from './activity-types'
import { formatDuration, formatSigned } from './format-duration'
import {
  buildMonthSummary,
  formatMonthParam,
  monthRangeUtc,
  parseMonthParam,
  shiftMonth,
  type SummaryEntryBase,
} from './month-summary'

const TODAY = '2026-11-11'
const NOV_2026 = { year: 2026, month: 11 } as const

function entry(date: string, minutes: number, activityType: ActivityType = 'SUPPORTO'): SummaryEntryBase {
  return { date: new Date(`${date}T00:00:00Z`), duration: minutes, activityType }
}

const H = 60

function summarize(entries: SummaryEntryBase[], year: number, month: number, today = TODAY) {
  return buildMonthSummary(entries, year, month, today)
}

function dayOf(summary: ReturnType<typeof summarize>, key: string) {
  const day = summary.days.find((d) => d.key === key)
  if (!day) throw new Error(`giorno ${key} assente`)
  return day
}

describe('parseMonthParam', () => {
  it('dovrebbe leggere il mese se il parametro è valido', () => {
    expect(parseMonthParam('2026-03', TODAY)).toEqual({ year: 2026, month: 3 })
  })

  it('dovrebbe ricadere sul mese di oggi se il parametro manca', () => {
    expect(parseMonthParam(undefined, TODAY)).toEqual(NOV_2026)
  })

  it.each(['2026-13', '2026-00', 'abc', '', '2026-1', '2026-11-05', '1969-05', '2101-01'])(
    'dovrebbe ricadere sul mese di oggi se il parametro è "%s"',
    (raw) => {
      expect(parseMonthParam(raw, TODAY)).toEqual(NOV_2026)
    },
  )
})

describe('shiftMonth', () => {
  it('dovrebbe passare a gennaio dell\'anno dopo se si avanza da dicembre', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('dovrebbe passare a dicembre dell\'anno prima se si torna indietro da gennaio', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })

  it('dovrebbe formattare il mese come YYYY-MM', () => {
    expect(formatMonthParam({ year: 2027, month: 1 })).toBe('2027-01')
  })
})

describe('monthRangeUtc', () => {
  it('dovrebbe escludere il primo giorno del mese successivo se la voce è a mezzanotte UTC', () => {
    const { start, end } = monthRangeUtc(2026, 11)
    const nextMonthFirst = new Date('2026-12-01T00:00:00Z')
    expect(nextMonthFirst >= start && nextMonthFirst < end).toBe(false)
  })

  it('dovrebbe includere il primo giorno del mese se la voce è a mezzanotte UTC', () => {
    const { start, end } = monthRangeUtc(2026, 11)
    const first = new Date('2026-11-01T00:00:00Z')
    expect(first >= start && first < end).toBe(true)
  })
})

describe('buildMonthSummary: giorni lavorativi', () => {
  it.each([
    [2026, 4, 21], // Lunedì dell'Angelo il 6, il 25 è sabato
    [2026, 11, 21], // Ognissanti è domenica
    [2026, 12, 21], // 8 e 25 festivi, il 26 è sabato
  ])('dovrebbe contare i giorni lavorativi se il mese è %i-%i', (year, month, expected) => {
    expect(summarize([], year, month).totals.workingDays).toBe(expected)
  })

  it('dovrebbe riconoscere il giorno festivo se cade in un giorno feriale', () => {
    expect(dayOf(summarize([], 2026, 12), '2026-12-08').isHoliday).toBe(true)
  })

  it('dovrebbe restituire un elemento per ogni giorno del mese se non ci sono voci', () => {
    expect(summarize([], 2026, 2).days).toHaveLength(28)
  })
})

describe('buildMonthSummary: scarto del giorno', () => {
  it('dovrebbe mostrare +2h se il giorno ha 8h più 2h di straordinario', () => {
    const s = summarize([entry('2026-11-03', 8 * H), entry('2026-11-03', 2 * H, 'STRAORDINARIO')], 2026, 11)
    expect(formatSigned(dayOf(s, '2026-11-03').deltaMinutes ?? 0)).toBe('+2h')
  })

  it('dovrebbe mostrare -30m se il giorno ha 7h30', () => {
    const s = summarize([entry('2026-11-10', 7 * H + 30)], 2026, 11)
    expect(formatSigned(dayOf(s, '2026-11-10').deltaMinutes ?? 0)).toBe('-30m')
  })

  it('dovrebbe contare l\'eccedenza come straordinario se il giorno supera le 8h', () => {
    const s = summarize([entry('2026-11-03', 10 * H)], 2026, 11)
    expect(dayOf(s, '2026-11-03').overtimeMinutes).toBe(2 * H)
  })

  it('dovrebbe lasciare lo scarto nullo se il giorno non è lavorativo', () => {
    const s = summarize([entry('2026-11-07', 3 * H)], 2026, 11)
    expect(dayOf(s, '2026-11-07').deltaMinutes).toBeNull()
  })

  it('dovrebbe sommare l\'eccedenza di un sabato lavorato come fa il calendario', () => {
    const s = summarize([entry('2026-11-07', 10 * H)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(2 * H)
  })
})

describe('buildMonthSummary: ferie e ore attese', () => {
  const WORKING_MINUTES = 21 * 8 * H

  it('dovrebbe ridurre le ore attese di una giornata se c\'è un giorno di ferie su un feriale', () => {
    const s = summarize([entry('2026-11-06', 8 * H, 'FERIE')], 2026, 11)
    expect(s.totals.expectedMinutes).toBe(WORKING_MINUTES - 8 * H)
  })

  it('dovrebbe lasciare invariate le ore attese se le ferie cadono di sabato', () => {
    const s = summarize([entry('2026-11-07', 8 * H, 'FERIE')], 2026, 11)
    expect(s.totals.expectedMinutes).toBe(WORKING_MINUTES)
  })

  it('dovrebbe contare al massimo 8h di ferie al giorno se ci sono due voci nello stesso giorno', () => {
    const s = summarize([entry('2026-11-06', 8 * H, 'FERIE'), entry('2026-11-06', 8 * H, 'FERIE')], 2026, 11)
    expect(s.totals.expectedMinutes).toBe(WORKING_MINUTES - 8 * H)
  })

  it('dovrebbe esprimere le ferie in giorni se sono mezze giornate', () => {
    const s = summarize([entry('2026-11-06', 4 * H, 'FERIE')], 2026, 11)
    expect(s.totals.ferieDays).toBe(0.5)
  })

  it('dovrebbe escludere le ferie dalle ore lavorate', () => {
    const s = summarize([entry('2026-11-06', 8 * H, 'FERIE')], 2026, 11)
    expect(s.totals.workedMinutes).toBe(0)
  })

  it('dovrebbe includere i permessi nelle ore lavorate come fa il calendario', () => {
    const s = summarize([entry('2026-11-05', 2 * H, 'PERMESSO')], 2026, 11)
    expect(s.totals.workedMinutes).toBe(2 * H)
  })

  it('dovrebbe contare le ferie nel totale del giorno per lo straordinario come fa il calendario', () => {
    const s = summarize([entry('2026-11-06', 8 * H, 'FERIE'), entry('2026-11-06', 1 * H)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(1 * H)
  })

  it('dovrebbe dare ore attese e avanzamento zero se le ferie coprono tutti i giorni lavorativi', () => {
    const workingKeys = summarize([], 2026, 12).days.filter((d) => d.isWorkingDay).map((d) => d.key)
    const s = summarize(workingKeys.map((key) => entry(key, 8 * H, 'FERIE')), 2026, 12, '2026-12-31')
    expect([s.totals.expectedMinutes, s.totals.progressPct]).toEqual([0, 0])
  })
})

describe('buildMonthSummary: giorni mancanti', () => {
  it('dovrebbe segnare mancante un giorno lavorativo passato senza voci', () => {
    expect(dayOf(summarize([], 2026, 11), '2026-11-04').missing).toBe(true)
  })

  it('dovrebbe non segnare mancante il giorno di oggi', () => {
    expect(dayOf(summarize([], 2026, 11), TODAY).missing).toBe(false)
  })

  it('dovrebbe non segnare mancante un giorno futuro', () => {
    expect(dayOf(summarize([], 2026, 11), '2026-11-12').missing).toBe(false)
  })

  it('dovrebbe non segnare mancante un weekend', () => {
    expect(dayOf(summarize([], 2026, 11), '2026-11-07').missing).toBe(false)
  })

  it('dovrebbe non segnare mancante un festivo feriale', () => {
    expect(dayOf(summarize([], 2026, 12), '2026-12-08').missing).toBe(false)
  })

  it('dovrebbe non segnare mancante un giorno con sole ferie', () => {
    const s = summarize([entry('2026-11-06', 8 * H, 'FERIE')], 2026, 11)
    expect(dayOf(s, '2026-11-06').missing).toBe(false)
  })

  it('dovrebbe segnalare oggi e futuro in base alla chiave di oggi', () => {
    const s = summarize([], 2026, 11)
    expect([dayOf(s, TODAY).isToday, dayOf(s, '2026-11-12').isFuture, dayOf(s, '2026-11-10').isFuture])
      .toEqual([true, true, false])
  })
})

describe('buildMonthSummary: confini del mese', () => {
  it('dovrebbe ignorare una voce del primo del mese successivo', () => {
    const s = summarize([entry('2026-12-01', 5 * H)], 2026, 11)
    expect(s.totals.workedMinutes).toBe(0)
  })

  it('dovrebbe ignorare una voce dell\'ultimo giorno del mese precedente', () => {
    const s = summarize([entry('2026-10-31', 5 * H)], 2026, 11)
    expect(s.days.reduce((n, d) => n + d.entries.length, 0)).toBe(0)
  })

  it('dovrebbe conservare l\'ordine delle voci dentro il giorno', () => {
    const a = entry('2026-11-02', 1 * H)
    const b = entry('2026-11-02', 2 * H, 'MANUTENZIONE')
    expect(dayOf(summarize([a, b], 2026, 11), '2026-11-02').entries).toEqual([a, b])
  })
})

describe('buildMonthSummary: dataset di esempio del mockup (novembre 2026, oggi 11)', () => {
  const entries = [
    entry('2026-11-02', 3 * H),
    entry('2026-11-02', 4 * H + 30, 'MANUTENZIONE'),
    entry('2026-11-02', 30),
    entry('2026-11-03', 4 * H),
    entry('2026-11-03', 4 * H, 'MANUTENZIONE'),
    entry('2026-11-03', 2 * H, 'STRAORDINARIO'),
    entry('2026-11-05', 6 * H, 'MANUTENZIONE'),
    entry('2026-11-05', 2 * H, 'PERMESSO'),
    entry('2026-11-06', 8 * H, 'FERIE'),
    entry('2026-11-09', 1 * H),
    entry('2026-11-09', 5 * H + 30, 'MANUTENZIONE'),
    entry('2026-11-09', 1 * H + 30),
    entry('2026-11-10', 3 * H),
    entry('2026-11-10', 4 * H + 30, 'MANUTENZIONE'),
    entry('2026-11-11', 2 * H),
    entry('2026-11-11', 1 * H + 30, 'MANUTENZIONE'),
  ]
  const { totals } = summarize(entries, 2026, 11)

  it('dovrebbe dare 45h lavorate', () => {
    expect(totals.workedMinutes).toBe(45 * H)
  })

  it('dovrebbe dare 160h attese', () => {
    expect(totals.expectedMinutes).toBe(160 * H)
  })

  it('dovrebbe dare avanzamento 28%', () => {
    expect(totals.progressPct).toBe(28)
  })

  it('dovrebbe dare +2h di straordinario', () => {
    expect(totals.overtimeMinutes).toBe(2 * H)
  })

  it('dovrebbe dare un solo giorno senza voci, mercoledì 4', () => {
    expect(totals.missingDays).toEqual(['2026-11-04'])
  })

  it('dovrebbe dare 15h di supporto e 26h di manutenzione', () => {
    expect([totals.byType.SUPPORTO, totals.byType.MANUTENZIONE]).toEqual([15 * H, 26 * H])
  })

  it('dovrebbe dare 1 giorno di ferie', () => {
    expect(totals.ferieDays).toBe(1)
  })
})

describe('formatDuration', () => {
  it.each([
    [180, '3h'],
    [270, '4h30'],
    [30, '30m'],
    [65, '1h05'],
    [0, '0h'],
  ])('dovrebbe formattare %i minuti come %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })

  it('dovrebbe esprimere le ferie in giorni se il tipo è FERIE', () => {
    expect(formatDuration(480, 'FERIE')).toBe('1g')
  })

  it('dovrebbe esprimere una mezza giornata di ferie con un decimale', () => {
    expect(formatDuration(240, 'FERIE')).toBe('0.5g')
  })
})

describe('formatSigned', () => {
  it.each([
    [120, '+2h'],
    [-30, '-30m'],
    [0, '0h'],
    [90, '+1h30'],
  ])('dovrebbe formattare lo scarto %i come %s', (minutes, expected) => {
    expect(formatSigned(minutes)).toBe(expected)
  })
})
