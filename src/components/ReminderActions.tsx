'use client'

import { useRef, useState, useTransition } from 'react'
import { Check, Trash2, Pencil, X, Save } from 'lucide-react'
import { completeReminder, deleteReminder, updateReminder } from '@/app/actions'
import { toDatetimeLocal } from './ReminderForm'
import styles from './ReminderBoard.module.css'

type ReminderData = {
  id: string
  title: string
  notes: string | null
  scheduledAt: Date
  recurrence: string | null
  recurrenceEnd: Date | null
}

type RecurrenceValue = '' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export default function ReminderActions({ reminder }: { reminder: ReminderData }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isCompleting, startComplete] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isSaving, startSave] = useTransition()

  // Stato form di modifica
  const [title, setTitle] = useState(reminder.title)
  const [notes, setNotes] = useState(reminder.notes ?? '')
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(reminder.scheduledAt))
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(
    (reminder.recurrence as RecurrenceValue) ?? ''
  )
  const [recurrenceEnd, setRecurrenceEnd] = useState(
    reminder.recurrenceEnd ? toDatetimeLocal(reminder.recurrenceEnd) : ''
  )

  const openDialog = () => {
    // Risincronizza i campi con i dati attuali
    setTitle(reminder.title)
    setNotes(reminder.notes ?? '')
    setScheduledAt(toDatetimeLocal(reminder.scheduledAt))
    setRecurrence((reminder.recurrence as RecurrenceValue) ?? '')
    setRecurrenceEnd(reminder.recurrenceEnd ? toDatetimeLocal(reminder.recurrenceEnd) : '')
    dialogRef.current?.showModal()
  }

  const handleSave = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    startSave(async () => {
      await updateReminder(reminder.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        recurrence: recurrence || null,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd).toISOString() : null,
      })
      dialogRef.current?.close()
    })
  }

  const busy = isCompleting || isDeleting || isSaving

  return (
    <>
      <div className={styles.reminderActions}>
        <button
          className={styles.reminderCompleteBtn}
          onClick={() => startComplete(() => completeReminder(reminder.id))}
          disabled={busy}
          title="Segna come completato"
        >
          <Check size={11} />
          Fatto
        </button>
        <button
          className={styles.reminderEditBtn}
          onClick={openDialog}
          disabled={busy}
          title="Modifica reminder"
          aria-label="Modifica"
        >
          <Pencil size={12} />
        </button>
        <button
          className={styles.reminderDeleteBtn}
          onClick={() => startDelete(() => deleteReminder(reminder.id))}
          disabled={busy}
          title="Elimina reminder"
          aria-label="Elimina"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.editDialog}
        onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close() }}
      >
        <div className={styles.editHeader}>
          <h3 className={styles.editTitle}>Modifica reminder</h3>
          <button
            type="button"
            className={styles.editCloseBtn}
            onClick={() => dialogRef.current?.close()}
            aria-label="Chiudi"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.editForm}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Titolo *</label>
            <input
              className={styles.editInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div className={styles.editField}>
            <label className={styles.editLabel}>Note</label>
            <input
              className={styles.editInput}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Note aggiuntive (opzionale)"
            />
          </div>

          <div className={styles.editField}>
            <label className={styles.editLabel}>Data e ora *</label>
            <input
              type="datetime-local"
              className={styles.editInput}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className={styles.editField}>
            <label className={styles.editLabel}>Ripetizione</label>
            <select
              className={styles.editSelect}
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
          </div>

          {recurrence && (
            <div className={styles.editField}>
              <label className={styles.editLabel}>Fine ripetizione (opzionale)</label>
              <input
                type="datetime-local"
                className={styles.editInput}
                value={recurrenceEnd}
                onChange={(e) => setRecurrenceEnd(e.target.value)}
              />
            </div>
          )}

          <div className={styles.editActions}>
            <button
              type="button"
              className={styles.editCancelBtn}
              onClick={() => dialogRef.current?.close()}
              disabled={isSaving}
            >
              Annulla
            </button>
            <button type="submit" className={styles.editSaveBtn} disabled={isSaving}>
              <Save size={13} />
              {isSaving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
