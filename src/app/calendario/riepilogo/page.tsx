import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { isAuthEnabled } from '@/lib/session'
import { todayLocalIso } from '@/lib/dates'
import { ACTIVITY_TYPE_LABELS, type ActivityType } from '@/lib/activity-types'
import {
  formatDays,
  formatDuration,
  formatSigned,
  MONTH_NAMES_IT,
  WEEKDAY_SHORT_IT,
} from '@/lib/format-duration'
import {
  buildMonthSummary,
  formatMonthParam,
  monthRangeUtc,
  parseMonthParam,
} from '@/lib/month-summary'
import Navbar from '@/components/Navbar'
import MonthNav from '@/components/MonthNav'
import MonthSummaryDay from '@/components/MonthSummaryDay'
import CalendarViewSwitch from '@/components/CalendarViewSwitch'
import styles from './page.module.css'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

/** Ordine con cui si elencano i tipi nella riga "Per tipo". */
const TYPE_ORDER: ActivityType[] = ['SUPPORTO', 'MANUTENZIONE', 'STRAORDINARIO', 'PERMESSO', 'FERIE']

/** Quanti giorni senza voci si nominano nella card prima di scrivere "+N". */
const MAX_MISSING_LISTED = 3

async function readMonth(searchParams: SearchParams) {
  const { month } = await searchParams
  return parseMonthParam(typeof month === 'string' ? month : undefined, todayLocalIso())
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { year, month } = await readMonth(searchParams)
  return { title: `Riepilogo ${MONTH_NAMES_IT[month - 1]} ${year}` }
}

export default async function RiepilogoPage({ searchParams }: { searchParams: SearchParams }) {
  const { year, month } = await readMonth(searchParams)
  const todayKey = todayLocalIso()
  const currentMonthParam = todayKey.slice(0, 7)
  const monthParam = formatMonthParam({ year, month })
  const isCurrentMonth = monthParam === currentMonthParam

  const { start, end } = monthRangeUtc(year, month)
  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { client: true, project: true, tags: true },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  const { days, totals } = buildMonthSummary(entries, year, month, todayKey)
  const monthLabel = `${MONTH_NAMES_IT[month - 1]} ${year}`

  const missingLabels = totals.missingDays.map((key) => {
    const day = days.find((d) => d.key === key)
    return day ? `${WEEKDAY_SHORT_IT[day.weekday].toLowerCase()} ${day.day}` : key
  })
  const missingListed = missingLabels.slice(0, MAX_MISSING_LISTED).join(', ')
  const missingMore = missingLabels.length - MAX_MISSING_LISTED

  const permessiMinutes = totals.byType.PERMESSO
  const ferieMinutes = totals.byType.FERIE
  const typeParts = TYPE_ORDER.filter((t) => totals.byType[t] > 0).map(
    (t) => `${ACTIVITY_TYPE_LABELS[t]} ${formatDuration(totals.byType[t], t)}`,
  )

  const monthNav = (
    <MonthNav basePath="/calendario/riepilogo" year={year} month={month} isCurrentMonth={isCurrentMonth} />
  )

  return (
    <div className={styles.page}>
      <Navbar centerSlot={monthNav} showLogout={isAuthEnabled()} />
      <h1 className={styles.srOnly}>Riepilogo di {monthLabel}</h1>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore lavorate</p>
          <p className={styles.statValue}>{formatDuration(totals.workedMinutes)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore attese</p>
          <p className={styles.statValue}>{formatDuration(totals.expectedMinutes)}</p>
          <span className={styles.statSub}>
            {totals.workingDays}gg lav.{totals.ferieDays > 0 && ` − ${formatDays(totals.ferieDays)}gg ferie`}
          </span>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Avanzamento</p>
          <p className={styles.statValue}>
            {totals.progressPct}
            <span className={styles.statUnit}>%</span>
          </p>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label="Avanzamento rispetto alle ore attese"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(totals.progressPct, 100)}
          >
            <div className={styles.progressFill} style={{ width: `${Math.min(totals.progressPct, 100)}%` }} />
          </div>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Straordinario</p>
          <p className={totals.overtimeMinutes > 0 ? `${styles.statValue} ${styles.statValueWarn}` : styles.statValue}>
            {totals.overtimeMinutes > 0 ? formatSigned(totals.overtimeMinutes) : '0h'}
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Assenze</p>
          {permessiMinutes > 0 || ferieMinutes > 0 ? (
            <div className={styles.statLines}>
              {permessiMinutes > 0 && <span>Permessi {formatDuration(permessiMinutes)}</span>}
              {ferieMinutes > 0 && <span>Ferie {formatDuration(ferieMinutes, 'FERIE')}</span>}
            </div>
          ) : (
            <p className={styles.statValue}>—</p>
          )}
        </div>
        <div className={totals.missingDays.length > 0 ? `${styles.statCard} ${styles.statCardWarn}` : styles.statCard}>
          <p className={styles.statLabel}>Senza voci</p>
          <p className={totals.missingDays.length > 0 ? `${styles.statValue} ${styles.statValueWarn}` : styles.statValue}>
            {totals.missingDays.length}
          </p>
          {totals.missingDays.length > 0 && (
            <span className={`${styles.statSub} ${styles.statSubWarn}`}>
              {missingListed}
              {missingMore > 0 && ` +${missingMore}`}
            </span>
          )}
        </div>
      </div>

      {typeParts.length > 0 && (
        <p className={styles.byType}>
          <span className={styles.byTypeLabel}>Per tipo:</span>
          {typeParts.join(' · ')}
        </p>
      )}

      <div className={styles.toolbar}>
        <CalendarViewSwitch active="riepilogo" month={monthParam} />
        {(!isCurrentMonth || entries.length > 0) && (
          <Link
            href={isCurrentMonth ? `#giorno-${todayKey}` : `/calendario/riepilogo#giorno-${todayKey}`}
            className={styles.toolLink}
          >
            Vai a oggi
          </Link>
        )}
      </div>

      {entries.length === 0 ? (
        <div className={styles.empty}>
          <p>Nessuna voce registrata a {monthLabel}</p>
          <Link href="/oggi" prefetch={false} className={styles.addLink}>
            <Plus size={14} aria-hidden />
            Aggiungi voce
          </Link>
        </div>
      ) : (
        <div className={styles.days}>
          {days.map((day) => (
            <MonthSummaryDay key={day.key} day={day} year={year} month={month} />
          ))}
        </div>
      )}
    </div>
  )
}
