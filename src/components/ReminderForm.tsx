'use client'

import { useState, useTransition } from 'react'
import { Bell, Plus } from 'lucide-react'
import { createReminder } from '@/app/actions'
import styles from './ReminderBoard.module.css'

export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function quickTime(offsetMinutes: number): string {
  return toDatetimeLocal(new Date(Date.now() + offsetMinutes * 60 * 1000))
}

type RecurrenceValue = '' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export default function ReminderForm() {
  const [open, setOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(() => quickTime(30))
  const [recurrence, setRecurrence] = useState<RecurrenceValue>('')
  const [recurrenceEnd, setRecurrenceEnd] = useState('')
  const [isPending, startTransition] = useTransition()

  const reset = () => {
    setScheduledAt(quickTime(30))
    setRecurrence('')
    setRecurrenceEnd('')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title') as string
    const notes = (fd.get('notes') as string).trim() || undefined
    const scheduledAtIso = new Date(scheduledAt).toISOString()
    const recurrenceVal = recurrence || null
    const recurrenceEndIso = recurrenceEnd ? new Date(recurrenceEnd).toISOString() : null

    startTransition(async () => {
      await createReminder({
        title,
        notes,
        scheduledAt: scheduledAtIso,
        recurrence: recurrenceVal,
        recurrenceEnd: recurrenceEndIso,
      })
      setOpen(false)
      reset()
    })
  }

  if (!open) {
    return (
      <button className={styles.addBtn} onClick={() => setOpen(true)}>
        <Bell size={13} />
        Nuovo reminder
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.addForm}>
      <input
        name="title"
        className={styles.addInput}
        placeholder="Cosa ricordare? *"
        required
        autoFocus
        maxLength={200}
      />
      <input
        name="notes"
        className={styles.addInput}
        placeholder="Note aggiuntive (opzionale)"
        maxLength={500}
      />
      <div className={styles.addRow}>
        <input
          type="datetime-local"
          className={styles.addInput}
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
          style={{ flex: 1 }}
        />
      </div>
      <div className={styles.quickButtons}>
        <span className={styles.quickLabel}>Scorciatoie:</span>
        <button type="button" className={styles.quickBtn} onClick={() => setScheduledAt(quickTime(30))}>+30min</button>
        <button type="button" className={styles.quickBtn} onClick={() => setScheduledAt(quickTime(60))}>+1h</button>
        <button type="button" className={styles.quickBtn} onClick={() => setScheduledAt(quickTime(120))}>+2h</button>
        <button type="button" className={styles.quickBtn} onClick={() => setScheduledAt(quickTime(240))}>+4h</button>
      </div>

      <div className={styles.recurrenceRow}>
        <select
          className={styles.addSelect}
          value={recurrence}
          onChange={(e) => {
            setRecurrence(e.target.value as RecurrenceValue)
            if (!e.target.value) setRecurrenceEnd('')
          }}
        >
          <option value="">Non ripetere</option>
          <option value="DAILY">Ogni giorno</option>
          <option value="WEEKLY">Ogni settimana</option>
          <option value="MONTHLY">Ogni mese</option>
          <option value="YEARLY">Ogni anno</option>
        </select>
        {recurrence && (
          <input
            type="datetime-local"
            className={styles.addInput}
            value={recurrenceEnd}
            onChange={(e) => setRecurrenceEnd(e.target.value)}
            title="Fine ripetizione (opzionale)"
            placeholder="Fine ripetizione"
            style={{ flex: 1 }}
          />
        )}
      </div>

      <div className={styles.addActions}>
        <button
          type="button"
          className={styles.addCancelBtn}
          onClick={() => { setOpen(false); reset() }}
          disabled={isPending}
        >
          Annulla
        </button>
        <button type="submit" className={styles.addSaveBtn} disabled={isPending}>
          <Plus size={13} />
          {isPending ? 'Aggiunta…' : 'Aggiungi reminder'}
        </button>
      </div>
    </form>
  )
}
