'use client'

import { useRef, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, X } from 'lucide-react'
import { timeEntrySchema, type TimeEntryInput } from '@/lib/schemas'
import { updateTimeEntry } from '@/app/actions'
import styles from './EditButton.module.css'
import listStyles from './TimeEntryList.module.css'

type EntrySnapshot = {
  id: string
  title: string
  description: string | null
  activityType: 'SUPPORTO' | 'MANUTENZIONE'
  duration: number
  date: Date
  clientName: string | null
  projectName: string | null
  tags: string[]
}

export default function EditButton({ entry }: { entry: EntrySnapshot }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()

  const defaultValues: TimeEntryInput = {
    title: entry.title,
    description: entry.description ?? '',
    activityType: entry.activityType,
    duration: entry.duration,
    date: entry.date.toISOString().split('T')[0],
    clientName: entry.clientName ?? '',
    projectName: entry.projectName ?? '',
    tags: entry.tags.join(', '),
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TimeEntryInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues,
  })

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  const onSubmit = (data: TimeEntryInput) => {
    startTransition(async () => {
      await updateTimeEntry(entry.id, data)
      close()
    })
  }

  return (
    <>
      <button
        className={listStyles.deleteButton}
        title="Modifica"
        onClick={open}
      >
        <Pencil size={14} />
      </button>

      <dialog ref={dialogRef} className={styles.dialog} onClick={(e) => {
        if (e.target === dialogRef.current) close()
      }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Modifica voce</h2>
          <button className={styles.closeBtn} onClick={close} type="button" aria-label="Chiudi">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Titolo *</label>
              <input {...register('title')} className={styles.input} />
              {errors.title && <p className={styles.error}>{errors.title.message}</p>}
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Tipo *</span>
              <div className={styles.radioCol}>
                <label className={styles.radioLabel}>
                  <input type="radio" value="SUPPORTO" {...register('activityType')} />
                  Supporto
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" value="MANUTENZIONE" {...register('activityType')} />
                  Manutenz.
                </label>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descrizione</label>
            <textarea {...register('description')} className={styles.textarea} rows={2} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Durata (min) *</label>
              <input type="number" min={1} max={1440} {...register('duration')} className={styles.input} />
              {errors.duration && <p className={styles.error}>{errors.duration.message}</p>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Data *</label>
              <input type="date" {...register('date')} className={styles.input} />
              {errors.date && <p className={styles.error}>{errors.date.message}</p>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Cliente</label>
              <input {...register('clientName')} className={styles.input} placeholder="Nome cliente" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Progetto</label>
              <input {...register('projectName')} className={styles.input} placeholder="Nome progetto" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tag (virgola)</label>
            <input {...register('tags')} className={styles.input} placeholder="bug-fix, meeting…" />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={close} disabled={isPending}>
              Annulla
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isPending}>
              {isPending ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
