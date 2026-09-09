'use client'

import { useTransition, useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { createTask } from '@/app/actions'
import styles from './TaskBoard.module.css'

const QUICK_PICK_LIMIT = 8

type Props = {
  clients: { id: string; name: string }[]
  projects: { id: string; name: string; clientId: string | null }[]
}

export default function AddTaskForm({ clients, projects }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [stimaOre, setStimaOre] = useState(0)
  const [stimaMin, setStimaMin] = useState(0)
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')

  const selectedClient = useMemo(() => {
    const n = clientName.trim().toLowerCase()
    if (!n) return undefined
    return clients.find((c) => c.name.toLowerCase() === n)
  }, [clients, clientName])

  // Come nel form manuale: i progetti si restringono al cliente scelto, se ne ha
  const projectOptions = useMemo(() => {
    if (!selectedClient) return projects
    const filtered = projects.filter((p) => p.clientId === selectedClient.id)
    return filtered.length > 0 ? filtered : projects
  }, [projects, selectedClient])

  const topClients = useMemo(() => clients.slice(0, QUICK_PICK_LIMIT), [clients])
  const topProjects = useMemo(() => projectOptions.slice(0, QUICK_PICK_LIMIT), [projectOptions])

  const reset = () => {
    setStimaOre(0)
    setStimaMin(0)
    setClientName('')
    setProjectName('')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const estimatedMinutes = (stimaOre * 60 + stimaMin) || undefined
    const data = {
      title: fd.get('title') as string,
      notes: (fd.get('notes') as string) || undefined,
      clientName: clientName.trim() || undefined,
      projectName: projectName.trim() || undefined,
      estimatedMinutes,
    }
    startTransition(async () => {
      await createTask(data)
      setOpen(false)
      reset()
      form.reset()
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
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          list="task-clients-list"
          className={styles.addInput}
          placeholder="Cliente"
          aria-label="Cliente"
        />
        <datalist id="task-clients-list">
          {clients.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          list="task-projects-list"
          className={styles.addInput}
          placeholder="Progetto"
          aria-label="Progetto"
        />
        <datalist id="task-projects-list">
          {projectOptions.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        <div className={styles.logDurationPair}>
          <input
            type="number" min={0} max={999}
            value={stimaOre}
            onChange={(e) => setStimaOre(parseInt(e.target.value) || 0)}
            className={`${styles.addInput} ${styles.logDurationUnitInput}`}
            placeholder="0"
            aria-label="Stima, ore"
          />
          <span className={styles.logDurationUnitLabel}>h</span>
          <input
            type="number" min={0} max={59}
            value={stimaMin}
            onChange={(e) => setStimaMin(parseInt(e.target.value) || 0)}
            className={`${styles.addInput} ${styles.logDurationUnitInput}`}
            placeholder="0"
            aria-label="Stima, minuti"
          />
          <span className={styles.logDurationUnitLabel}>min</span>
        </div>
      </div>

      {(topClients.length > 0 || topProjects.length > 0) && (
        <details className={styles.logFold}>
          <summary className={styles.logFoldSummary}>Suggerimenti rapidi</summary>
          <div className={styles.logFoldBody}>
            {topClients.length > 0 && (
              <div className={styles.chipBlock}>
                <p className={styles.chipLegend}>Clienti</p>
                <div className={styles.chipRow} role="group" aria-label="Suggerimenti cliente">
                  {topClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.chip}
                      onClick={() => setClientName(c.name)}
                      aria-label={`Imposta cliente ${c.name}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {topProjects.length > 0 && (
              <div className={styles.chipBlock}>
                <p className={styles.chipLegend}>
                  Progetti{selectedClient ? ` · ${selectedClient.name}` : ''}
                </p>
                <div className={styles.chipRow} role="group" aria-label="Suggerimenti progetto">
                  {topProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.chip}
                      onClick={() => setProjectName(p.name)}
                      aria-label={`Imposta progetto ${p.name}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

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
          {isPending ? 'Aggiunta…' : 'Aggiungi'}
        </button>
      </div>
    </form>
  )
}
