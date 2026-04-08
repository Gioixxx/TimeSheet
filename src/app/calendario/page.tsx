import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, List, Sun } from 'lucide-react'
import styles from './page.module.css'

function getMonthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  return { start, end }
}

function buildCalendarWeeks(year: number, month: number, dayMap: Map<string, number>) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  // ISO week: Monday = 0 ... Sunday = 6
  const startDow = (firstDay.getUTCDay() + 6) % 7

  const cells: Array<{ day: number | null; key: string; minutes: number }> = []

  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, key: `empty-${i}`, minutes: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, key, minutes: dayMap.get(key) ?? 0 })
  }
  // Fill trailing empty cells to complete last row
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: `end-${cells.length}`, minutes: 0 })
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

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

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

  const weeks = buildCalendarWeeks(year, month, dayMap)
  const activeDays = dayMap.size

  // Prev / next month links
  const prevDate = new Date(Date.UTC(year, month - 2, 1))
  const nextDate = new Date(Date.UTC(year, month, 1))
  const prevParam = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`
  const nextParam = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`

  const currentMonthParam = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = `${year}-${String(month).padStart(2, '0')}` === currentMonthParam

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            Time<span className={styles.titleAccent}>sheet</span>
          </h1>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>
              <List size={14} />
              Lista
            </Link>
            <Link href="/oggi" className={styles.navLink}>
              <Sun size={14} />
              Oggi
            </Link>
            <span className={styles.navLinkActive}>Calendario</span>
          </nav>
        </div>
      </header>

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

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore del mese</p>
          <p className={styles.statValue}>{(totalMinutes / 60).toFixed(1)}<span className={styles.statUnit}>h</span></p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Giorni attivi</p>
          <p className={styles.statValue}>{activeDays}</p>
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
          {weeks.map((week, wi) =>
            week.map((cell) => (
              <div
                key={cell.key}
                className={`${styles.cell} ${!cell.day ? styles.cellEmpty : ''} ${cell.minutes > 0 ? colorClass(cell.minutes) : ''}`}
              >
                {cell.day !== null && (
                  <>
                    <span className={styles.cellDay}>{cell.day}</span>
                    {cell.minutes > 0 && (
                      <span className={styles.cellHours}>{formatHours(cell.minutes)}</span>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorLow}`} /> &lt;2h</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorMid}`} /> 2–5h</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorHigh}`} /> 5–8h</span>
          <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.colorFull}`} /> 8h+</span>
        </div>
      </div>
    </div>
  )
}
