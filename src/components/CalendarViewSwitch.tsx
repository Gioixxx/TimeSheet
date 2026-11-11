import Link from 'next/link'
import styles from './CalendarViewSwitch.module.css'

/**
 * Interruttore Griglia | Riepilogo tra `/calendario` e `/calendario/riepilogo`.
 * `month` (`YYYY-MM`) si conserva passando da una vista all'altra.
 */
export default function CalendarViewSwitch({
  active,
  month,
}: {
  active: 'griglia' | 'riepilogo'
  month: string
}) {
  return (
    <nav className={styles.switch} aria-label="Vista del mese">
      {active === 'griglia' ? (
        <span className={styles.active} aria-current="page">Griglia</span>
      ) : (
        <Link href={`/calendario?month=${month}`} className={styles.option}>Griglia</Link>
      )}
      {active === 'riepilogo' ? (
        <span className={styles.active} aria-current="page">Riepilogo</span>
      ) : (
        <Link href={`/calendario/riepilogo?month=${month}`} className={styles.option}>Riepilogo</Link>
      )}
    </nav>
  )
}
