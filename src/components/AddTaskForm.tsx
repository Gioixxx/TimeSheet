'use client'

import { useTransition, useState } from 'react'
import { Plus } from 'lucide-react'
import { createTask } from '@/app/actions'
import styles from './TaskBoard.module.css'

export default function AddTaskForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [stimaOre, setStimaOre] = useState(0)
  const [stimaMin, setStimaMin] = useState(0)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const estimatedMinutes = (stimaOre * 60 + stimaMin) || undefined
    const data = {
      title: fd.get('title') as string,
      notes: (fd.get('notes') as string) || undefined,
      clientName: (fd.get('clientName') as string) || undefined,
      projectName: (fd.get('projectName') as string) || undefined,
      estimatedMinutes,
    }
    startTransition(async () => {
      await createTask(data)
      setOpen(false)
      setStimaOre(0)
      setStimaMin(0)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  if (!open) {
    return (
      <button className={styles.addBtn} onClick={() => setOpen(true)}>
        <Plus size={14} />
        Nuovo
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.addForm}>
      <input
        name="title"
        className={styles.addInput}
        placeholder="Titolo attività *"
        required
        autoFocus
      />
      <input
        name="notes"
        className={styles.addInput}
        placeholder="Note (opzionale)"
      />
      <div className={styles.addRow}>
        <input
          name="clientName"
          className={styles.addInput}
          placeholder="Cliente"
        />
        <input
          name="projectName"
          className={styles.addInput}
          placeholder="Progetto"
        />
        <div className={styles.logDurationPair}>
          <input
            type="number" min={0} max={999}
            value={stimaOre}
            onChange={(e) => setStimaOre(parseInt(e.target.value) || 0)}
            className={`${styles.addInput} ${styles.logDurationUnitInput}`}
            placeholder="0"
          />
          <span className={styles.logDurationUnitLabel}>h</span>
          <input
            type="number" min={0} max={59}
            value={stimaMin}
            onChange={(e) => setStimaMin(parseInt(e.target.value) || 0)}
            className={`${styles.addInput} ${styles.logDurationUnitInput}`}
            placeholder="0"
          />
          <span className={styles.logDurationUnitLabel}>min</span>
        </div>
      </div>
      <div className={styles.addActions}>
        <button
          type="button"
          className={styles.addCancelBtn}
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Annulla
        </button>
        <button type="submit" className={styles.addSaveBtn} disabled={isPending}>
          <Plus size={13} />
          {isPending ? 'Aggiunta…' : 'Aggiungi'}
        </button>
      </div>
    </form>
  )
}
