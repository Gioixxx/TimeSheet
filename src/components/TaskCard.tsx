'use client'

import { useRef, useTransition } from 'react'
import { X, Play, User, Briefcase, Clock } from 'lucide-react'
import { deleteTask, logTaskAsEntry } from '@/app/actions'
import styles from './TaskBoard.module.css'

type Task = {
  id: string
  title: string
  notes: string | null
  clientName: string | null
  projectName: string | null
  estimatedMinutes: number | null
}

export default function TaskCard({ task }: { task: Task }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]

  const handleLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const duration = Number(fd.get('duration'))
    const date = fd.get('date') as string
    const activityType = fd.get('activityType') as 'SUPPORTO' | 'MANUTENZIONE'
    startTransition(async () => {
      await logTaskAsEntry(task.id, duration, date, activityType)
      dialogRef.current?.close()
    })
  }

  const handleDelete = () => {
    startDeleteTransition(() => deleteTask(task.id))
  }

  return (
    <>
      <li className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardTitle}>{task.title}</span>
          <button
            className={styles.cardDeleteBtn}
            onClick={handleDelete}
            disabled={isDeleting}
            title="Rimuovi post-it"
            aria-label="Rimuovi"
          >
            <X size={13} />
          </button>
        </div>

        {task.notes && <p className={styles.cardNotes}>{task.notes}</p>}

        <div className={styles.cardMeta}>
          {task.clientName && (
            <span className={styles.cardChip}>
              <User size={10} />
              {task.clientName}
            </span>
          )}
          {task.projectName && (
            <span className={styles.cardChip}>
              <Briefcase size={10} />
              {task.projectName}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className={styles.cardChip}>
              <Clock size={10} />
              ~{task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 ? ` ${task.estimatedMinutes % 60}m` : ''}`
                : `${task.estimatedMinutes}m`}
            </span>
          )}
        </div>

        <button
          className={styles.logBtn}
          onClick={() => dialogRef.current?.showModal()}
          title="Registra tempo per questa attività"
        >
          <Play size={11} />
          Registra
        </button>
      </li>

      <dialog
        ref={dialogRef}
        className={styles.logDialog}
        onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close() }}
      >
        <div className={styles.logHeader}>
          <h3 className={styles.logTitle}>Registra: <em>{task.title}</em></h3>
          <button
            type="button"
            className={styles.logCloseBtn}
            onClick={() => dialogRef.current?.close()}
            aria-label="Chiudi"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleLog} className={styles.logForm}>
          {(task.clientName || task.projectName) && (
            <div className={styles.logHint}>
              {task.clientName && <span><User size={11} /> {task.clientName}</span>}
              {task.projectName && <span><Briefcase size={11} /> {task.projectName}</span>}
            </div>
          )}

          <div className={styles.logRow}>
            <div className={styles.logField}>
              <label className={styles.logLabel}>Durata (min) *</label>
              <input
                name="duration"
                type="number"
                min={1}
                max={1440}
                defaultValue={task.estimatedMinutes ?? 60}
                required
                className={styles.logInput}
              />
            </div>
            <div className={styles.logField}>
              <label className={styles.logLabel}>Data *</label>
              <input
                name="date"
                type="date"
                defaultValue={today}
                required
                className={styles.logInput}
              />
            </div>
          </div>

          <div className={styles.logField}>
            <span className={styles.logLabel}>Tipo *</span>
            <div className={styles.logRadioRow}>
              <label className={styles.logRadio}>
                <input type="radio" name="activityType" value="SUPPORTO" defaultChecked />
                Supporto
              </label>
              <label className={styles.logRadio}>
                <input type="radio" name="activityType" value="MANUTENZIONE" />
                Manutenzione
              </label>
            </div>
          </div>

          <div className={styles.logActions}>
            <button
              type="button"
              className={styles.logCancelBtn}
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
            >
              Annulla
            </button>
            <button type="submit" className={styles.logSaveBtn} disabled={isPending}>
              <Play size={13} />
              {isPending ? 'Salvataggio…' : 'Registra e chiudi'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
