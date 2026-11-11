import Link from 'next/link'
import { Clock, HeadphonesIcon, Plus, Sun, TrendingUp, Wrench } from 'lucide-react'
import { ACTIVITY_TYPE_LABELS, type ActivityType } from '@/lib/activity-types'
import {
  formatDuration,
  formatSigned,
  MONTH_NAMES_IT,
  WEEKDAY_SHORT_IT,
} from '@/lib/format-duration'
import type { DaySummary, SummaryEntry } from '@/lib/month-summary'
import styles from './MonthSummaryDay.module.css'

const ACTIVITY_ICONS: Record<ActivityType, typeof Wrench> = {
  SUPPORTO: HeadphonesIcon,
  MANUTENZIONE: Wrench,
  PERMESSO: Clock,
  FERIE: Sun,
  STRAORDINARIO: TrendingUp,
}

const BADGE_CLASS: Partial<Record<ActivityType, string>> = {
  STRAORDINARIO: styles.badgeOvertime,
  PERMESSO: styles.badgeAbsence,
  FERIE: styles.badgeAbsence,
}

type Balance = { text: string; tone: 'ok' | 'over' | 'under' | 'missing' | 'today' }

/** Cosa scrivere sotto il totale del giorno; il segno e il testo portano il senso, non il colore. */
function dayBalance(day: DaySummary<SummaryEntry>): Balance | null {
  if (day.missing) return { text: 'manca', tone: 'missing' }
  if (day.entries.length === 0) return day.isToday ? { text: 'oggi', tone: 'today' } : null
  if (day.isToday && day.overtimeMinutes === 0) return { text: 'oggi', tone: 'today' }
  if (day.deltaMinutes !== null) {
    if (day.deltaMinutes === 0) return { text: 'ok', tone: 'ok' }
    return {
      text: formatSigned(day.deltaMinutes),
      tone: day.deltaMinutes > 0 ? 'over' : 'under',
    }
  }
  // Giorno non lavorativo con voci: conta solo l'eccedenza, come nel calendario.
  if (day.overtimeMinutes > 0) return { text: formatSigned(day.overtimeMinutes), tone: 'over' }
  return null
}

const TONE_CLASS: Record<Balance['tone'], string> = {
  ok: styles.toneOk,
  over: styles.toneOver,
  under: styles.toneUnder,
  missing: styles.toneMissing,
  today: styles.toneToday,
}

function entryHref(dayKey: string, id: string): string {
  return `/calendario/${dayKey}?highlight=${id}&from=riepilogo#entry-${id}`
}

function EntryRow({ entry, dayKey }: { entry: SummaryEntry; dayKey: string }) {
  const Icon = ACTIVITY_ICONS[entry.activityType]
  const where = [entry.client?.name, entry.project?.name].filter(Boolean).join(' › ')
  const duration = formatDuration(entry.duration, entry.activityType)

  return (
    <li className={styles.entry}>
      <span className={where ? styles.where : `${styles.where} ${styles.whereNone}`}>
        {where || '(nessun cliente)'}
      </span>
      <div className={styles.what}>
        {/* Link "stirato" sull'intera riga (::after): un solo link per voce, nessun link annidato. */}
        <Link
          href={entryHref(dayKey, entry.id)}
          prefetch={false}
          className={styles.entryLink}
        >
          {entry.title}
          <span className={styles.srOnly}>, {duration}</span>
        </Link>
        {entry.description && <p className={styles.description}>{entry.description}</p>}
        {entry.tags.length > 0 && (
          <p className={styles.tags}>{entry.tags.map((t) => `#${t.name}`).join(' ')}</p>
        )}
      </div>
      <div className={styles.chips}>
        <span className={`${styles.badge} ${BADGE_CLASS[entry.activityType] ?? ''}`}>
          <Icon size={12} aria-hidden />
          {ACTIVITY_TYPE_LABELS[entry.activityType]}
        </span>
        <span className={styles.duration}>{duration}</span>
      </div>
    </li>
  )
}

/** Testo del giorno senza voci, e se vale la pena offrire "Aggiungi". */
function emptyState(day: DaySummary<SummaryEntry>): { text: string; canAdd: boolean; tone?: 'holiday' } {
  if (day.isHoliday) return { text: 'Festivo', canAdd: false, tone: 'holiday' }
  if (day.isWeekend) return { text: 'weekend', canAdd: false }
  if (day.missing) return { text: 'Nessuna voce — giorno lavorativo', canAdd: true }
  if (day.isToday) return { text: 'Nessuna voce oggi', canAdd: true }
  return { text: '', canAdd: false } // giorno futuro: basta il trattino del totale
}

/**
 * Un giorno del riepilogo: intestazione col link al giorno, le voci (ognuna un link al giorno,
 * dove si modifica) e il totale con lo scarto rispetto alle 8h.
 */
export default function MonthSummaryDay({ day, year, month }: { day: DaySummary<SummaryEntry>; year: number; month: number }) {
  const hasEntries = day.entries.length > 0
  const balance = dayBalance(day)
  const empty = hasEntries ? null : emptyState(day)
  const headingId = `giorno-${day.key}-titolo`

  const classes = [
    styles.day,
    hasEntries ? '' : styles.dayEmpty,
    day.isToday ? styles.dayToday : '',
    day.missing ? styles.dayMissing : '',
    day.isHoliday ? styles.dayHoliday : '',
    day.isWeekend && !day.isHoliday ? styles.dayWeekend : '',
    day.isFuture && !hasEntries ? styles.dayFuture : '',
    empty?.canAdd ? styles.dayAction : '',
  ].filter(Boolean).join(' ')

  return (
    <section id={`giorno-${day.key}`} aria-labelledby={headingId} className={classes}>
      <h2 id={headingId} className={styles.head}>
        <Link href={`/calendario/${day.key}?from=riepilogo`} prefetch={false} className={styles.headLink}>
          <span className={styles.dow}>{WEEKDAY_SHORT_IT[day.weekday]}</span>
          <span className={styles.num}>{day.day}</span>
          <span className={styles.mon} aria-hidden>{MONTH_NAMES_IT[month - 1].slice(0, 3)}</span>
          <span className={styles.srOnly}> {MONTH_NAMES_IT[month - 1]} {year}</span>
        </Link>
      </h2>

      {hasEntries ? (
        <ul className={styles.entries}>
          {day.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} dayKey={day.key} />
          ))}
        </ul>
      ) : (
        <div className={styles.emptyBody}>
          {empty?.text && (
            <span className={empty.tone === 'holiday' ? styles.emptyHoliday : styles.emptyText}>{empty.text}</span>
          )}
          {empty?.canAdd && (
            <Link href={`/oggi?date=${day.key}`} prefetch={false} className={styles.addLink}>
              <Plus size={12} aria-hidden />
              <span className={styles.addLong}>Aggiungi voce</span>
              <span className={styles.addShort}>Aggiungi</span>
            </Link>
          )}
        </div>
      )}

      <div className={styles.total}>
        {hasEntries || day.missing || day.isToday ? (
          <span className={styles.totalValue}>{formatDuration(day.totalMinutes)}</span>
        ) : (
          <span className={styles.totalNone} aria-hidden>—</span>
        )}
        {balance && <span className={`${styles.balance} ${TONE_CLASS[balance.tone]}`}>{balance.text}</span>}
      </div>
    </section>
  )
}
