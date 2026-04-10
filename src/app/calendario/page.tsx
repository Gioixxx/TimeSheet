import React from 'react'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import styles from './page.module.css'

function getMonthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  return { start, end }
}

function buildCalendarWeeks(
  year: number,
  month: number,
  dayMap: Map<string, number>,
  holidays: Set<string>,
) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  // ISO week: Monday = 0 ... Sunday = 6
  const startDow = (firstDay.getUTCDay() + 6) % 7

  const cells: Array<{ day: number | null; key: string; minutes: number; isWeekend: boolean; isHoliday: boolean }> = []

  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, key: `empty-${i}`, minutes: 0, isWeekend: false, isHoliday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay() // 0=Dom, 6=Sab
    const isWeekend = dow === 0 || dow === 6
    cells.push({ day: d, key, minutes: dayMap.get(key) ?? 0, isWeekend, isHoliday: holidays.has(key) })
  }
  // Fill trailing empty cells to complete last row
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: `end-${cells.length}`, minutes: 0, isWeekend: false, isHoliday: false })
  }

  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

function colorClass(minutes: number): string {
  if (minutes === 0) return ''
  if (minutes < 120) return styles.colorLow
  if (minutes < 300) return styles.colorMid
  if (minutes < 480) return styles.colorHigh
  return styles.colorFull
}

function formatHours(minutes: number): string {
  if (minutes === 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h${m}m`
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

function italianHolidays(year: number): Set<string> {
  const pad = (n: number) => String(n).padStart(2, '0')
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
  const easter = easterDate(year)
  const lunedi = new Date(easter)
  lunedi.setUTCDate(lunedi.getUTCDate() + 1)
  const luMon = `${lunedi.getUTCFullYear()}-${pad(lunedi.getUTCMonth() + 1)}-${pad(lunedi.getUTCDate())}`
  return new Set([...fixed, luMon])
}

function countWorkingDays(year: number, month: number): number {
  const holidays = italianHolidays(year)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay()
    if (dow === 0 || dow === 6) continue
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (!holidays.has(key)) count++
  }
  return count
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom', 'Sett.']

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const now = new Date()
  const rawMonth = typeof params.month === 'string' ? params.month : null
  const year = rawMonth ? parseInt(rawMonth.split('-')[0]) : now.getUTCFullYear()
  const month = rawMonth ? parseInt(rawMonth.split('-')[1]) : now.getUTCMonth() + 1

  const { start, end } = getMonthBounds(year, month)

  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, duration: true, activityType: true },
  })

  const dayMap = new Map<string, number>()
  let totalMinutes = 0
  let busiestDay = { key: '', minutes: 0 }

  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10)
    const prev = dayMap.get(key) ?? 0
    const next = prev + e.duration
    dayMap.set(key, next)
    totalMinutes += e.duration
    if (next > busiestDay.minutes) busiestDay = { key, minutes: next }
  }

  const holidays = italianHolidays(year)
  const weeks = buildCalendarWeeks(year, month, dayMap, holidays)
  const activeDays = dayMap.size
  const workingDays = countWorkingDays(year, month)
  const expectedMinutes = workingDays * 8 * 60
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

  // Prev / next month links
  const prevDate = new Date(Date.UTC(year, month - 2, 1))
  const nextDate = new Date(Date.UTC(year, month, 1))
  const prevParam = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`
  const nextParam = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`

  const currentMonthParam = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = `${year}-${String(month).padStart(2, '0')}` === currentMonthParam

  const monthNav = (
    <div className={styles.monthNav}>
      <Link href={`/calendario?month=${prevParam}`} className={styles.navBtn} aria-label="Mese precedente">
        <ChevronLeft size={18} />
      </Link>
      <div className={styles.monthTitle}>
        <span className={styles.monthName}>{MONTH_NAMES[month - 1]}</span>
        <span className={styles.monthYear}>{year}</span>
        {!isCurrentMonth && (
          <Link href="/calendario" className={styles.todayLink}>oggi</Link>
        )}
      </div>
      <Link href={`/calendario?month=${nextParam}`} className={styles.navBtn} aria-label="Mese successivo">
        <ChevronRight size={18} />
      </Link>
    </div>
  )

  return (
    <div className={styles.page}>
      <Navbar centerSlot={monthNav} />

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore del mese</p>
          <p className={styles.statValue}>{(totalMinutes / 60).toFixed(1)}<span className={styles.statUnit}>h</span></p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore attese</p>
          <p className={styles.statValue}>
            {(expectedMinutes / 60).toFixed(0)}
            <span className={styles.statUnit}>h</span>
            <span className={styles.statSub}>{workingDays}gg lav.</span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Avanzamento</p>
          <p className={styles.statValue}>
            {expectedMinutes > 0 ? Math.round((totalMinutes / expectedMinutes) * 100) : 0}
            <span className={styles.statUnit}>%</span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Giorni attivi</p>
          <p className={styles.statValue}>{activeDays}<span className={styles.statSub}>/ {workingDays}</span></p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Media / giorno attivo</p>
          <p className={styles.statValue}>
            {activeDays > 0 ? ((totalMinutes / activeDays) / 60).toFixed(1) : '0.0'}
            <span className={styles.statUnit}>h</span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Giorno più intenso</p>
          <p className={styles.statValue}>
            {busiestDay.key
              ? `${busiestDay.key.split('-')[2]}/${busiestDay.key.split('-')[1]} · ${formatHours(busiestDay.minutes)}`
              : '—'}
          </p>
        </div>
      </div>

      <div className={styles.calendarWrap}>
        <div className={styles.dayHeaders}>
          {DAY_NAMES.map((d) => (
            <div key={d} className={styles.dayHeader}>{d}</div>
          ))}
        </div>
        <div className={styles.grid}>
          {weeks.map((week, wi) => (
            <React.Fragment key={wi}>
              {week.map((cell) =>
                cell.day === null ? (
                  <div
                    key={cell.key}
                    className={`${styles.cell} ${styles.cellEmpty}`}
                  />
                ) : (
                  <Link
                    key={cell.key}
                    href={`/calendario/${cell.key}`}
                    className={[
                      styles.cell,
                      styles.cellClickable,
                      cell.minutes > 0 ? colorClass(cell.minutes) : '',
                      cell.key === todayKey ? styles.cellToday : '',
                      cell.isHoliday ? styles.cellHoliday : '',
                      cell.isWeekend && !cell.isHoliday ? styles.cellWeekend : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className={styles.cellDay}>{cell.day}</span>
                    {cell.isHoliday && <span className={styles.cellFestivo}>festivo</span>}
                    {cell.minutes > 0 && (
                      <span className={styles.cellHours}>{formatHours(cell.minutes)}</span>
                    )}
                  </Link>
                )
              )}
              <div key={`week-total-${wi}`} className={styles.weekTotalCell}>
                {formatHours(week.reduce((sum, c) => sum + c.minutes, 0))}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorLow}`} /> &lt;2h</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorMid}`} /> 2–5h</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorHigh}`} /> 5–8h</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorFull}`} /> 8h+</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.cellWeekend}`} /> weekend</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.cellHoliday}`} /> festivo</span>
        </div>
      </div>
    </div>
  )
}
