'use client'

import { useRef, useTransition, useState } from 'react'
import { X, Play, User, Briefcase, Clock, Pencil } from 'lucide-react'
import { deleteTask, logTaskAsEntry, updateTask } from '@/app/actions'
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
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isEditing, startEditTransition] = useTransition()

  const initOre = task.estimatedMinutes ? Math.floor(task.estimatedMinutes / 60) : 1
  const initMin = task.estimatedMinutes ? task.estimatedMinutes % 60 : 0

  const [logOre, setLogOre] = useState(initOre)
  const [logMin, setLogMin] = useState(initMin)
  const [stimaOre, setStimaOre] = useState(initOre)
  const [stimaMin, setStimaMin] = useState(initMin)

  const today = new Date().toISOString().split('T')[0]

  const handleLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const duration = Math.max(1, logOre * 60 + logMin)
    const date = fd.get('date') as string
    const activityType = fd.get('activityType') as 'SUPPORTO' | 'MANUTENZIONE'
    const description = (fd.get('description') as string) || undefined
    startTransition(async () => {
      await logTaskAsEntry(task.id, duration, date, activityType, description)
      dialogRef.current?.close()
    })
  }

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title') as string
    const notes = (fd.get('notes') as string) || undefined
    const clientName = (fd.get('clientName') as string) || undefined
    const projectName = (fd.get('projectName') as string) || undefined
    const estimatedMinutes = (stimaOre * 60 + stimaMin) || undefined
    startEditTransition(async () => {
      await updateTask(task.id, { title, notes, clientName, projectName, estimatedMinutes })
      editDialogRef.current?.close()
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
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              className={styles.editTaskBtn}
              onClick={() => editDialogRef.current?.showModal()}
              title="Modifica task"
              aria-label="Modifica"
            >
              <Pencil size={12} />
            </button>
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
              <label className={styles.logLabel}>Durata *</label>
              <div className={styles.logDurationPair}>
                <input
                  type="number" min={0} max={23}
                  value={logOre}
                  onChange={(e) => setLogOre(parseInt(e.target.value) || 0)}
                  className={`${styles.logInput} ${styles.logDurationUnitInput}`}
                />
                <span className={styles.logDurationUnitLabel}>h</span>
                <input
                  type="number" min={0} max={59}
                  value={logMin}
                  onChange={(e) => setLogMin(parseInt(e.target.value) || 0)}
                  className={`${styles.logInput} ${styles.logDurationUnitInput}`}
                />
                <span className={styles.logDurationUnitLabel}>min</span>
              </div>
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
            <label className={styles.logLabel}>Descrizione</label>
            <textarea
              name="description"
              defaultValue={task.notes ?? ''}
              rows={2}
              className={styles.logTextarea}
            />
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

      <dialog
        ref={editDialogRef}
        className={styles.logDialog}
        onClick={(e) => { if (e.target === editDialogRef.current) editDialogRef.current?.close() }}
      >
        <div className={styles.logHeader}>
          <h3 className={styles.logTitle}>Modifica task</h3>
          <button
            type="button"
            className={styles.logCloseBtn}
            onClick={() => editDialogRef.current?.close()}
            aria-label="Chiudi"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleEdit} className={styles.logForm}>
          <div className={styles.logField}>
            <label className={styles.logLabel}>Titolo *</label>
            <input
              name="title"
              type="text"
              defaultValue={task.title}
              required
              className={styles.logInput}
            />
          </div>

          <div className={styles.logField}>
            <label className={styles.logLabel}>Note</label>
            <textarea
              name="notes"
              defaultValue={task.notes ?? ''}
              rows={2}
              className={styles.logTextarea}
            />
          </div>

          <div className={styles.logRow}>
            <div className={styles.logField}>
              <label className={styles.logLabel}>Cliente</label>
              <input
                name="clientName"
                type="text"
                defaultValue={task.clientName ?? ''}
                className={styles.logInput}
              />
            </div>
            <div className={styles.logField}>
              <label className={styles.logLabel}>Progetto</label>
              <input
                name="projectName"
                type="text"
                defaultValue={task.projectName ?? ''}
                className={styles.logInput}
              />
            </div>
          </div>

          <div className={styles.logField}>
            <label className={styles.logLabel}>Stima</label>
            <div className={styles.logDurationPair}>
              <input
                type="number" min={0} max={999}
                value={stimaOre}
                onChange={(e) => setStimaOre(parseInt(e.target.value) || 0)}
                className={`${styles.logInput} ${styles.logDurationUnitInput}`}
              />
              <span className={styles.logDurationUnitLabel}>h</span>
              <input
                type="number" min={0} max={59}
                value={stimaMin}
                onChange={(e) => setStimaMin(parseInt(e.target.value) || 0)}
                className={`${styles.logInput} ${styles.logDurationUnitInput}`}
              />
              <span className={styles.logDurationUnitLabel}>min</span>
            </div>
          </div>

          <div className={styles.logActions}>
            <button
              type="button"
              className={styles.logCancelBtn}
              onClick={() => editDialogRef.current?.close()}
              disabled={isEditing}
            >
              Annulla
            </button>
            <button type="submit" className={styles.logSaveBtn} disabled={isEditing}>
              <Pencil size={13} />
              {isEditing ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
