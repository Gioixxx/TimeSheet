'use client'

import { useRef, useTransition, useState, useMemo } from 'react'
import { X, Play, User, Briefcase, Clock, Pencil } from 'lucide-react'
import { todayLocalIso } from '@/lib/dates'
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  MINUTES_PER_WORKDAY,
  type ActivityType,
} from '@/lib/activity-types'
import { deleteTask, logTaskAsEntry, updateTask } from '@/app/actions'
import type { OverflowChoice, OverflowInfo } from '@/lib/day-overflow'
import OverflowPrompt, { overflowKey } from './OverflowPrompt'
import styles from './TaskBoard.module.css'

const QUICK_PICK_LIMIT = 8

type Task = {
  id: string
  title: string
  notes: string | null
  clientName: string | null
  projectName: string | null
  estimatedMinutes: number | null
}

type Props = {
  task: Task
  clients: { id: string; name: string }[]
  projects: { id: string; name: string; clientId: string | null }[]
  tags: { id: string; name: string }[]
}

export default function TaskCard({ task, clients, projects, tags }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const logFormRef = useRef<HTMLFormElement>(null)
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isEditing, startEditTransition] = useTransition()

  const initOre = task.estimatedMinutes ? Math.floor(task.estimatedMinutes / 60) : 1
  const initMin = task.estimatedMinutes ? task.estimatedMinutes % 60 : 0

  const [logOre, setLogOre] = useState(initOre)
  const [logMin, setLogMin] = useState(initMin)
  const [logGiorni, setLogGiorni] = useState(1)
  const [stimaOre, setStimaOre] = useState(initOre)
  const [stimaMin, setStimaMin] = useState(initMin)

  // Campi della voce, precompilati dal task ma modificabili prima di registrare
  const [logType, setLogType] = useState<ActivityType>('SUPPORTO')
  const [logTitle, setLogTitle] = useState(task.title)
  const [logClient, setLogClient] = useState(task.clientName ?? '')
  const [logProject, setLogProject] = useState(task.projectName ?? '')
  const [logTags, setLogTags] = useState('')
  const [logError, setLogError] = useState<string | null>(null)
  const [logDate, setLogDate] = useState(todayLocalIso)
  const [overflow, setOverflow] = useState<{ info: OverflowInfo; key: string } | null>(null)

  const isFerie = logType === 'FERIE'
  // FERIE si misura in giornate lavorative, come nel form manuale
  const logDuration = isFerie
    ? Math.max(1, Math.round(logGiorni * MINUTES_PER_WORKDAY))
    : Math.max(1, logOre * 60 + logMin)

  const currentKey = overflowKey({ date: logDate, duration: logDuration, activityType: logType })
  const pendingOverflow = overflow?.key === currentKey ? overflow : null

  const selectedClient = useMemo(() => {
    const n = logClient.trim().toLowerCase()
    if (!n) return undefined
    return clients.find((c) => c.name.toLowerCase() === n)
  }, [clients, logClient])

  // Come nel form manuale: i progetti si restringono al cliente scelto, se ne ha
  const projectOptions = useMemo(() => {
    if (!selectedClient) return projects
    const filtered = projects.filter((p) => p.clientId === selectedClient.id)
    return filtered.length > 0 ? filtered : projects
  }, [projects, selectedClient])

  const topClients = useMemo(() => clients.slice(0, QUICK_PICK_LIMIT), [clients])
  const topProjects = useMemo(() => projectOptions.slice(0, QUICK_PICK_LIMIT), [projectOptions])
  const topTags = useMemo(() => tags.slice(0, QUICK_PICK_LIMIT), [tags])

  const appendTag = (name: string) => {
    const existing = logTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    if (existing.includes(name.toLowerCase())) return
    setLogTags(logTags.trim() ? `${logTags.trim()}, ${name}` : name)
  }

  const openLogDialog = () => {
    // Risincronizza i campi col task a ogni apertura
    setLogTitle(task.title)
    setLogClient(task.clientName ?? '')
    setLogProject(task.projectName ?? '')
    setLogTags('')
    setLogType('SUPPORTO')
    setLogOre(initOre)
    setLogMin(initMin)
    setLogGiorni(1)
    setLogDate(todayLocalIso())
    setLogError(null)
    setOverflow(null)
    dialogRef.current?.showModal()
  }

  const submitLog = (choice?: OverflowChoice) => {
    const form = logFormRef.current
    if (!form) return
    const fd = new FormData(form)
    const entry = {
      title: logTitle.trim(),
      description: (fd.get('description') as string)?.trim() || undefined,
      activityType: logType,
      duration: logDuration,
      date: logDate,
      clientName: logClient.trim() || undefined,
      projectName: logProject.trim() || undefined,
      tags: logTags.trim() || undefined,
    }

    setLogError(null)
    startTransition(async () => {
      try {
        const result = await logTaskAsEntry(task.id, entry, choice)
        if (!result.ok) {
          setOverflow({ info: result.overflow, key: overflowKey(entry) })
          return
        }
        setOverflow(null)
        dialogRef.current?.close()
      } catch {
        setLogError('Controlla i campi: titolo e durata sono obbligatori.')
      }
    })
  }

  const handleLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submitLog()
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
          onClick={openLogDialog}
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

        <form ref={logFormRef} onSubmit={handleLog} className={styles.logForm}>
          {logError && <p className={styles.logError}>{logError}</p>}

          <div className={styles.logField}>
            <label className={styles.logLabel} htmlFor={`log-title-${task.id}`}>Titolo *</label>
            <input
              id={`log-title-${task.id}`}
              type="text"
              value={logTitle}
              onChange={(e) => setLogTitle(e.target.value)}
              required
              maxLength={200}
              className={styles.logInput}
            />
          </div>

          <div className={styles.logField}>
            <span className={styles.logLabel}>Tipo *</span>
            <div className={styles.logRadioRow}>
              {ACTIVITY_TYPES.map((type) => (
                <label key={type} className={styles.logRadio}>
                  <input
                    type="radio"
                    name="activityType"
                    value={type}
                    checked={logType === type}
                    onChange={() => setLogType(type)}
                  />
                  {ACTIVITY_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.logRow}>
            <div className={styles.logField}>
              <label className={styles.logLabel}>Durata *</label>
              {isFerie ? (
                <div className={styles.logDurationPair}>
                  <input
                    type="number" min={0.5} max={30} step={0.5}
                    value={logGiorni}
                    onChange={(e) => setLogGiorni(parseFloat(e.target.value) || 1)}
                    className={`${styles.logInput} ${styles.logDurationUnitInput}`}
                  />
                  <span className={styles.logDurationUnitLabel}>giorni</span>
                </div>
              ) : (
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
              )}
            </div>
            <div className={styles.logField}>
              <label className={styles.logLabel}>Data *</label>
              <input
                name="date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
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

          <div className={styles.logRow}>
            <div className={styles.logField}>
              <label className={styles.logLabel} htmlFor={`log-client-${task.id}`}>Cliente</label>
              <input
                id={`log-client-${task.id}`}
                type="text"
                value={logClient}
                onChange={(e) => setLogClient(e.target.value)}
                list={`log-clients-${task.id}`}
                className={styles.logInput}
                placeholder="Nessun cliente"
              />
              <datalist id={`log-clients-${task.id}`}>
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className={styles.logField}>
              <label className={styles.logLabel} htmlFor={`log-project-${task.id}`}>Progetto</label>
              <input
                id={`log-project-${task.id}`}
                type="text"
                value={logProject}
                onChange={(e) => setLogProject(e.target.value)}
                list={`log-projects-${task.id}`}
                className={styles.logInput}
                placeholder="Nessun progetto"
              />
              <datalist id={`log-projects-${task.id}`}>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.logField}>
            <label className={styles.logLabel} htmlFor={`log-tags-${task.id}`}>
              Tag <span className={styles.logLabelHint}>separati da virgola</span>
            </label>
            <input
              id={`log-tags-${task.id}`}
              type="text"
              value={logTags}
              onChange={(e) => setLogTags(e.target.value)}
              list={`log-taglist-${task.id}`}
              className={styles.logInput}
              placeholder="es. urgente, backup"
            />
            <datalist id={`log-taglist-${task.id}`}>
              {tags.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>

          {(topClients.length > 0 || topProjects.length > 0 || topTags.length > 0) && (
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
                          onClick={() => setLogClient(c.name)}
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
                          onClick={() => setLogProject(p.name)}
                          aria-label={`Imposta progetto ${p.name}`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {topTags.length > 0 && (
                  <div className={styles.chipBlock}>
                    <p className={styles.chipLegend}>Tag</p>
                    <div className={styles.chipRow} role="group" aria-label="Suggerimenti tag">
                      {topTags.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={styles.chip}
                          onClick={() => appendTag(t.name)}
                          aria-label={`Aggiungi tag ${t.name}`}
                        >
                          #{t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          {pendingOverflow && (
            <OverflowPrompt
              info={pendingOverflow.info}
              pending={isPending}
              onChoose={submitLog}
              onCancel={() => setOverflow(null)}
            />
          )}

          <div className={styles.logActions}>
            <button
              type="button"
              className={styles.logCancelBtn}
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
            >
              Annulla
            </button>
            <button type="submit" className={styles.logSaveBtn} disabled={isPending || !!pendingOverflow}>
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
