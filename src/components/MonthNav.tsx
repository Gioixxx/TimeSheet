import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTH_NAMES_IT } from '@/lib/format-duration'
import { formatMonthParam, shiftMonth } from '@/lib/month-summary'
import styles from './MonthNav.module.css'

/**
 * Navigazione del mese (frecce e "oggi") per lo slot centrale della Navbar.
 * `basePath` è la pagina di destinazione: i link sono `basePath?month=YYYY-MM`, e "oggi"
 * torna a `basePath` senza parametro (mese corrente).
 */
export default function MonthNav({
  basePath,
  year,
  month,
  isCurrentMonth,
}: {
  basePath: string
  year: number
  month: number
  isCurrentMonth: boolean
}) {
  const prev = formatMonthParam(shiftMonth(year, month, -1))
  const next = formatMonthParam(shiftMonth(year, month, 1))

  return (
    <div className={styles.monthNav}>
      <Link href={`${basePath}?month=${prev}`} className={styles.navBtn} aria-label="Mese precedente">
        <ChevronLeft size={18} aria-hidden />
      </Link>
      <div className={styles.monthTitle}>
        <span className={styles.monthName}>{MONTH_NAMES_IT[month - 1]}</span>
        <span className={styles.monthYear}>{year}</span>
        {!isCurrentMonth && (
          <Link href={basePath} className={styles.todayLink}>oggi</Link>
        )}
      </div>
      <Link href={`${basePath}?month=${next}`} className={styles.navBtn} aria-label="Mese successivo">
        <ChevronRight size={18} aria-hidden />
      </Link>
    </div>
  )
}
