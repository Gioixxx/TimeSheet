import { describe, expect, it } from 'vitest'
import type { ActivityType } from './activity-types'
import { buildMonthSummary, monthRangeUtc, shiftMonth, type SummaryEntryBase } from './month-summary'

const H = 60
const TODAY = '2026-11-11'
const FAR_FUTURE = '2100-01-01'

function entryAt(iso: string, minutes: number, activityType: ActivityType = 'SUPPORTO'): SummaryEntryBase {
  return { date: new Date(iso), duration: minutes, activityType }
}

function entry(date: string, minutes: number, activityType: ActivityType = 'SUPPORTO') {
  return entryAt(`${date}T00:00:00Z`, minutes, activityType)
}

function summarize(entries: SummaryEntryBase[], year: number, month: number, today = TODAY) {
  return buildMonthSummary(entries, year, month, today)
}

function dayOf(summary: ReturnType<typeof summarize>, key: string) {
  const day = summary.days.find((d) => d.key === key)
  if (!day) throw new Error(`giorno ${key} assente`)
  return day
}

describe('mese che inizia di domenica e festivo (1 novembre 2026)', () => {
  const s = summarize([], 2026, 11)

  it('dovrebbe avere 30 giorni se il mese è novembre', () => {
    expect(s.days).toHaveLength(30)
  })

  it('dovrebbe far cadere il primo giorno di domenica', () => {
    expect(dayOf(s, '2026-11-01').weekday).toBe(0)
  })

  it('dovrebbe segnare il primo giorno come festivo se è Ognissanti', () => {
    expect(dayOf(s, '2026-11-01').isHoliday).toBe(true)
  })

  it('dovrebbe non contare il primo giorno come lavorativo se è domenica e festivo', () => {
    expect(dayOf(s, '2026-11-01').isWorkingDay).toBe(false)
  })

  it('dovrebbe non contare il primo giorno come mancante se non è lavorativo', () => {
    expect(s.totals.missingDays).not.toContain('2026-11-01')
  })

  it('dovrebbe contare il 2 novembre come primo giorno lavorativo', () => {
    expect(s.days.find((d) => d.isWorkingDay)?.key).toBe('2026-11-02')
  })
})

describe('febbraio', () => {
  it.each([
    [2027, 28],
    [2028, 29],
    [2100, 28],
    [2000, 29],
  ])('dovrebbe avere il numero giusto di giorni se l\'anno è %i', (year, expected) => {
    expect(summarize([], year, 2).days).toHaveLength(expected)
  })

  it('dovrebbe contare 20 giorni lavorativi se febbraio 2027 non è bisestile', () => {
    expect(summarize([], 2027, 2).totals.workingDays).toBe(20)
  })

  it('dovrebbe contare 21 giorni lavorativi se febbraio 2028 è bisestile', () => {
    expect(summarize([], 2028, 2).totals.workingDays).toBe(21)
  })

  it('dovrebbe accettare una voce del 29 febbraio se l\'anno è bisestile', () => {
    expect(summarize([entry('2028-02-29', 2 * H)], 2028, 2).totals.workedMinutes).toBe(2 * H)
  })

  it('dovrebbe mandare una voce del 1 marzo nel mese di marzo se febbraio non è bisestile', () => {
    expect(summarize([entry('2027-03-01', 2 * H)], 2027, 2).totals.workedMinutes).toBe(0)
  })

  it('dovrebbe finire la finestra UTC al 1 marzo se febbraio è bisestile', () => {
    expect(monthRangeUtc(2028, 2).end.toISOString()).toBe('2028-03-01T00:00:00.000Z')
  })

  it('dovrebbe finire la finestra UTC al 1 marzo se febbraio non è bisestile', () => {
    expect(monthRangeUtc(2027, 2).end.toISOString()).toBe('2027-03-01T00:00:00.000Z')
  })
})

describe('passaggio ora legale e solare', () => {
  it('dovrebbe avere 31 giorni se è ottobre con il cambio all\'ora solare (25 ottobre 2026)', () => {
    expect(summarize([], 2026, 10).days).toHaveLength(31)
  })

  it('dovrebbe contare 22 giorni lavorativi se il mese è ottobre 2026', () => {
    expect(summarize([], 2026, 10).totals.workingDays).toBe(22)
  })

  it('dovrebbe contare 22 giorni lavorativi se il mese è marzo 2026 con il cambio all\'ora legale', () => {
    expect(summarize([], 2026, 3).totals.workingDays).toBe(22)
  })

  it('dovrebbe assegnare la voce al 25 ottobre se la data è a mezzanotte UTC', () => {
    const s = summarize([entry('2026-10-25', 1 * H)], 2026, 10)
    expect(dayOf(s, '2026-10-25').totalMinutes).toBe(1 * H)
  })

  it('dovrebbe assegnare la voce al 29 marzo se la data è a mezzanotte UTC nel giorno del cambio', () => {
    const s = summarize([entry('2026-03-29', 1 * H)], 2026, 3)
    expect(dayOf(s, '2026-03-29').totalMinutes).toBe(1 * H)
  })

  it('dovrebbe assegnare le voci di due giorni consecutivi al cambio ora a giorni distinti', () => {
    const s = summarize([entry('2026-10-24', 1 * H), entry('2026-10-25', 2 * H), entry('2026-10-26', 3 * H)], 2026, 10)
    expect(['24', '25', '26'].map((d) => dayOf(s, `2026-10-${d}`).totalMinutes)).toEqual([1 * H, 2 * H, 3 * H])
  })

  it('dovrebbe restare nel mese se un\'ora locale del 31 marzo equivale a UTC 22:00 del 30', () => {
    const s = summarize([entryAt('2026-03-30T22:00:00Z', 1 * H)], 2026, 3)
    expect(dayOf(s, '2026-03-30').totalMinutes).toBe(1 * H)
  })
})

describe('voci a cavallo della mezzanotte e al confine del mese', () => {
  it('dovrebbe tenere nel mese una voce a un millisecondo dalla fine', () => {
    const s = summarize([entryAt('2026-11-30T23:59:59.999Z', 1 * H)], 2026, 11)
    expect(dayOf(s, '2026-11-30').totalMinutes).toBe(1 * H)
  })

  it('dovrebbe escludere una voce esattamente a mezzanotte UTC del mese successivo', () => {
    const s = summarize([entryAt('2026-12-01T00:00:00.000Z', 1 * H)], 2026, 11)
    expect(s.totals.workedMinutes).toBe(0)
  })

  it('dovrebbe includere una voce esattamente a mezzanotte UTC del primo del mese', () => {
    const s = summarize([entryAt('2026-11-01T00:00:00.000Z', 1 * H)], 2026, 11)
    expect(dayOf(s, '2026-11-01').totalMinutes).toBe(1 * H)
  })

  it('dovrebbe escludere una voce a un millisecondo dall\'inizio del mese', () => {
    const s = summarize([entryAt('2026-10-31T23:59:59.999Z', 1 * H)], 2026, 11)
    expect(s.totals.workedMinutes).toBe(0)
  })

  it('dovrebbe assegnare allo stesso giorno due voci a mezzanotte e a fine giornata', () => {
    const s = summarize([entryAt('2026-11-03T00:00:00Z', 1 * H), entryAt('2026-11-03T23:59:59Z', 1 * H)], 2026, 11)
    expect(dayOf(s, '2026-11-03').entries).toHaveLength(2)
  })

  it('dovrebbe passare a dicembre dell\'anno dopo la finestra UTC se il mese è dicembre', () => {
    expect(monthRangeUtc(2026, 12).end.toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })

  it('dovrebbe calcolare lo spostamento di 12 mesi come lo stesso mese dell\'anno dopo', () => {
    expect(shiftMonth(2026, 11, 12)).toEqual({ year: 2027, month: 11 })
  })
})

describe('ferie su festivo e weekend', () => {
  const WORKING_DEC = 21 * 8 * H

  it('dovrebbe lasciare invariate le ore attese se le ferie cadono su un festivo feriale', () => {
    const s = summarize([entry('2026-12-08', 8 * H, 'FERIE')], 2026, 12)
    expect(s.totals.expectedMinutes).toBe(WORKING_DEC)
  })

  it('dovrebbe non contare giorni di ferie se cadono su un festivo feriale', () => {
    const s = summarize([entry('2026-12-08', 8 * H, 'FERIE')], 2026, 12)
    expect(s.totals.ferieDays).toBe(0)
  })

  it('dovrebbe non contare giorni di ferie se cadono di domenica', () => {
    const s = summarize([entry('2026-11-08', 8 * H, 'FERIE')], 2026, 11)
    expect(s.totals.ferieDays).toBe(0)
  })

  it('dovrebbe non contare giorni di ferie se cadono su Ognissanti di domenica', () => {
    const s = summarize([entry('2026-11-01', 8 * H, 'FERIE')], 2026, 11)
    expect(s.totals.ferieDays).toBe(0)
  })

  it('dovrebbe tenere le ferie su un festivo nel totale per tipo', () => {
    const s = summarize([entry('2026-12-08', 8 * H, 'FERIE')], 2026, 12)
    expect(s.totals.byType.FERIE).toBe(8 * H)
  })

  it('dovrebbe non produrre straordinario se le ferie su un festivo sono di 8h', () => {
    const s = summarize([entry('2026-12-08', 8 * H, 'FERIE')], 2026, 12)
    expect(s.totals.overtimeMinutes).toBe(0)
  })

  it('dovrebbe contare solo il feriale se le ferie sono di 8h il venerdì e 8h il sabato', () => {
    const s = summarize([entry('2026-11-06', 8 * H, 'FERIE'), entry('2026-11-07', 8 * H, 'FERIE')], 2026, 11)
    expect(s.totals.ferieDays).toBe(1)
  })

  it('dovrebbe limitare le ferie a un giorno se in un giorno ci sono 12h di ferie', () => {
    const s = summarize([entry('2026-11-06', 12 * H, 'FERIE')], 2026, 11)
    expect(s.totals.ferieDays).toBe(1)
  })
})

describe('soglia dello straordinario a 480 minuti', () => {
  it('dovrebbe dare straordinario zero se il giorno ha esattamente 480 minuti', () => {
    const s = summarize([entry('2026-11-03', 480)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(0)
  })

  it('dovrebbe dare scarto zero se il giorno ha esattamente 480 minuti', () => {
    const s = summarize([entry('2026-11-03', 480)], 2026, 11)
    expect(dayOf(s, '2026-11-03').deltaMinutes).toBe(0)
  })

  it('dovrebbe dare 1 minuto di straordinario se il giorno ha 481 minuti', () => {
    const s = summarize([entry('2026-11-03', 481)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(1)
  })

  it('dovrebbe dare straordinario zero se il giorno ha 479 minuti', () => {
    const s = summarize([entry('2026-11-03', 479)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(0)
  })

  it('dovrebbe raggiungere 480 minuti sommando più voci dello stesso giorno senza straordinario', () => {
    const s = summarize([entry('2026-11-03', 200), entry('2026-11-03', 280)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(0)
  })

  it('dovrebbe sommare lo straordinario di giorni diversi', () => {
    const s = summarize([entry('2026-11-03', 540), entry('2026-11-04', 500)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(80)
  })

  it('dovrebbe non compensare un giorno corto con uno lungo nello straordinario', () => {
    const s = summarize([entry('2026-11-03', 300), entry('2026-11-04', 540)], 2026, 11)
    expect(s.totals.overtimeMinutes).toBe(60)
  })
})

describe('altri casi limite dei totali', () => {
  it('dovrebbe avere ore attese pari ai giorni lavorativi per 8h se non ci sono voci', () => {
    expect(summarize([], 2026, 11).totals.expectedMinutes).toBe(21 * 8 * H)
  })

  it('dovrebbe avere avanzamento zero se non ci sono voci', () => {
    expect(summarize([], 2026, 11).totals.progressPct).toBe(0)
  })

  it('dovrebbe segnare mancanti tutti i giorni lavorativi se il mese è interamente passato e vuoto', () => {
    expect(summarize([], 2026, 11, FAR_FUTURE).totals.missingDays).toHaveLength(21)
  })

  it('dovrebbe non segnare alcun giorno mancante se il mese è interamente futuro', () => {
    expect(summarize([], 2026, 11, '2026-10-01').totals.missingDays).toEqual([])
  })

  it('dovrebbe superare il 100% di avanzamento se le ore lavorate eccedono le attese', () => {
    const s = summarize([entry('2026-11-02', 200 * H)], 2026, 11)
    expect(s.totals.progressPct).toBe(119)
  })

  it('dovrebbe avere tutti i tipi a zero nel byType se non ci sono voci', () => {
    const values = Object.values(summarize([], 2026, 11).totals.byType)
    expect(values.every((v) => v === 0)).toBe(true)
  })
})
