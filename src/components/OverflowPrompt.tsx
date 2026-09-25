'use client'

import { useEffect, useId, useRef } from 'react'
import { AlertTriangle, CalendarArrowDown, TrendingUp } from 'lucide-react'
import type { OverflowChoice, OverflowInfo } from '@/lib/day-overflow'
import styles from './OverflowPrompt.module.css'

type Props = {
  info: OverflowInfo
  pending: boolean
  onChoose: (choice: OverflowChoice) => void
  onCancel: () => void
}

/** Chiave dei valori per cui è stata calcolata l'eccedenza: se cambiano, la domanda decade. */
export function overflowKey(values: { date: string; duration: number | string; activityType: string }) {
  return `${values.date}|${Number(values.duration)}|${values.activityType}`
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDay(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
}

/**
 * Chiede cosa fare delle ore che superano le 8h del giorno. Pannello in linea e non modale,
 * così funziona anche dentro i `<dialog>` di modifica e registrazione da post-it.
 */
export default function OverflowPrompt({ info, pending, onChoose, onCancel }: Props) {
  const titleId = useId()
  const firstButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstButtonRef.current?.focus()
  }, [])

  const total = info.regularMinutes + info.entryMinutes
  const spreadLabel =
    info.spread.length === 1
      ? `Sposta a ${formatDay(info.spread[0].date)}`
      : `Sposta su ${info.spread.length} giorni`

  return (
    <div className={styles.panel} role="group" aria-labelledby={titleId}>
      <p className={styles.title} id={titleId}>
        <AlertTriangle size={14} aria-hidden />
        Oltre le 8 ore
      </p>
      <p className={styles.text} aria-live="polite">
        Le ore di <strong>{formatDay(info.date)}</strong> arriverebbero a{' '}
        <strong>{formatMinutes(total)}</strong>: <strong>{formatMinutes(info.excessMinutes)}</strong>{' '}
        oltre la giornata lavorativa. Come vuoi registrarle?
      </p>
      <div className={styles.actions}>
        <button
          ref={firstButtonRef}
          type="button"
          className={styles.choice}
          disabled={pending}
          onClick={() => onChoose('STRAORDINARIO')}
        >
          <TrendingUp size={14} aria-hidden />
          Come straordinario
        </button>
        <button
          type="button"
          className={styles.choice}
          disabled={pending}
          onClick={() => onChoose('SPREAD')}
        >
          <CalendarArrowDown size={14} aria-hidden />
          {spreadLabel}
        </button>
        <button type="button" className={styles.cancel} disabled={pending} onClick={onCancel}>
          Annulla
        </button>
      </div>
      <p className={styles.spread}>
        Spostando:{' '}
        {info.spread.map((c) => `${formatDay(c.date)} · ${formatMinutes(c.minutes)}`).join(', ')}
      </p>
    </div>
  )
}
