'use client'

import { useRef, useTransition, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, X } from 'lucide-react'
import { timeEntrySchema, type TimeEntryInput } from '@/lib/schemas'
import { updateTimeEntry } from '@/app/actions'
import type { OverflowChoice, OverflowInfo } from '@/lib/day-overflow'
import OverflowPrompt, { overflowKey } from './OverflowPrompt'
import styles from './EditButton.module.css'
import listStyles from './TimeEntryList.module.css'

type EntrySnapshot = {
  id: string
  title: string
  description: string | null
  activityType: 'SUPPORTO' | 'MANUTENZIONE' | 'PERMESSO' | 'FERIE' | 'STRAORDINARIO'
  duration: number
  date: Date
  clientName: string | null
  projectName: string | null
  tags: string[]
}

export default function EditButton({ entry }: { entry: EntrySnapshot }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()

  const [ore, setOre] = useState(Math.floor(entry.duration / 60))
  const [minuti, setMinuti] = useState(entry.duration % 60)
  const [giorni, setGiorni] = useState(Math.round(entry.duration / 480 * 10) / 10)
  const [overflow, setOverflow] = useState<{ info: OverflowInfo; key: string } | null>(null)

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
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TimeEntryInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues,
  })

  const activityType = watch('activityType')
  const isFerie = activityType === 'FERIE'

  const currentKey = overflowKey({ date: watch('date'), duration: watch('duration'), activityType })
  const pendingOverflow = overflow?.key === currentKey ? overflow : null

  useEffect(() => {
    const computed = isFerie ? Math.max(1, Math.round(giorni * 480)) : Math.max(1, ore * 60 + minuti)
    setValue('duration', computed)
  }, [ore, minuti, giorni, isFerie, setValue])

  // Riparte dalla voce salvata: dopo una divisione (straordinario o spostamento) la durata
  // salvata è diversa da quella digitata, e riaprire il dialog non deve riproporre la vecchia.
  const open = () => {
    reset(defaultValues)
    setOre(Math.floor(entry.duration / 60))
    setMinuti(entry.duration % 60)
    setGiorni(Math.round(entry.duration / 480 * 10) / 10)
    setOverflow(null)
    dialogRef.current?.showModal()
  }
  const close = () => dialogRef.current?.close()

  const save = (data: TimeEntryInput, choice?: OverflowChoice) => {
    startTransition(async () => {
      const result = await updateTimeEntry(entry.id, data, choice)
      if (!result.ok) {
        setOverflow({ info: result.overflow, key: overflowKey(data) })
        return
      }
      setOverflow(null)
      close()
    })
  }

  const onSubmit = (data: TimeEntryInput) => save(data)
  const chooseOverflow = (choice: OverflowChoice) => handleSubmit((data) => save(data, choice))()

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
                <label className={styles.radioLabel}>
                  <input type="radio" value="PERMESSO" {...register('activityType')} />
                  Permesso
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" value="FERIE" {...register('activityType')} />
                  Ferie
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" value="STRAORDINARIO" {...register('activityType')} />
                  Straord.
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
              <label className={styles.label}>Durata *</label>
              <input type="hidden" {...register('duration')} />
              {isFerie ? (
                <div className={styles.durationPair}>
                  <input
                    type="number" min={0.5} max={30} step={0.5}
                    value={giorni}
                    onChange={(e) => setGiorni(parseFloat(e.target.value) || 1)}
                    className={`${styles.input} ${styles.durationUnitInput}`}
                  />
                  <span className={styles.durationUnitLabel}>giorni</span>
                </div>
              ) : (
                <div className={styles.durationPair}>
                  <input
                    type="number" min={0} max={23}
                    value={ore}
                    onChange={(e) => setOre(parseInt(e.target.value) || 0)}
                    className={`${styles.input} ${styles.durationUnitInput}`}
                  />
                  <span className={styles.durationUnitLabel}>h</span>
                  <input
                    type="number" min={0} max={59}
                    value={minuti}
                    onChange={(e) => setMinuti(parseInt(e.target.value) || 0)}
                    className={`${styles.input} ${styles.durationUnitInput}`}
                  />
                  <span className={styles.durationUnitLabel}>min</span>
                </div>
              )}
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

          {pendingOverflow && (
            <OverflowPrompt
              info={pendingOverflow.info}
              pending={isPending}
              onChoose={chooseOverflow}
              onCancel={() => setOverflow(null)}
            />
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={close} disabled={isPending}>
              Annulla
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isPending || !!pendingOverflow}>
              {isPending ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
