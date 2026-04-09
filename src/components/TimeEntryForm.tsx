'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Mic, MicOff, Clock, Sparkles } from 'lucide-react'
import { timeEntrySchema, type TimeEntryInput } from '@/lib/schemas'
import { createTimeEntry, parseNaturalLanguageTimeEntry } from '@/app/actions'
import styles from './TimeEntryForm.module.css'

const QUICK_PICK_LIMIT = 8

type Props = {
  clients: { id: string; name: string }[]
  projects: { id: string; name: string; clientId: string | null }[]
  tags: { id: string; name: string }[]
  defaultDate?: string
}

type AnyRecognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onstart: () => void
  onend: () => void
  onerror: () => void
  onresult: (e: { results: { [0]: { [0]: { transcript: string } } } }) => void
  start: () => void
  stop: () => void
}
type WinSpeech = {
  SpeechRecognition?: new () => AnyRecognition
  webkitSpeechRecognition?: new () => AnyRecognition
}

function createSpeechRecognition(
  onResult: (transcript: string) => void,
  onStateChange: (listening: boolean) => void
): AnyRecognition | null {
  const win = window as unknown as WinSpeech
  const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition
  if (!SR) {
    alert('Il tuo browser non supporta il riconoscimento vocale.')
    return null
  }
  const recognition = new SR()
  recognition.lang = 'it-IT'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onstart = () => onStateChange(true)
  recognition.onend = () => onStateChange(false)
  recognition.onerror = () => onStateChange(false)
  recognition.onresult = (event) => onResult(event.results[0][0].transcript)
  return recognition
}

export default function TimeEntryForm({ clients, projects, tags, defaultDate }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isNlPending, startNlTransition] = useTransition()
  const [isListening, setIsListening] = useState(false)
  const [isNlListening, setIsNlListening] = useState(false)
  const [nlText, setNlText] = useState('')
  const [nlError, setNlError] = useState<string | null>(null)
  const recognitionRef = useRef<AnyRecognition | null>(null)
  const nlRecognitionRef = useRef<AnyRecognition | null>(null)

  const [ore, setOre] = useState(1)
  const [minuti, setMinuti] = useState(0)
  const [giorni, setGiorni] = useState(1)

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<TimeEntryInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: { date: defaultDate ?? today, duration: 60, activityType: 'SUPPORTO' },
  })

  const activityType = watch('activityType')
  const isFerie = activityType === 'FERIE'

  useEffect(() => {
    const computed = isFerie ? Math.max(1, Math.round(giorni * 480)) : Math.max(1, ore * 60 + minuti)
    setValue('duration', computed)
  }, [ore, minuti, giorni, isFerie, setValue])

  const clientNameValue = watch('clientName')?.trim() ?? ''

  const selectedClient = useMemo(() => {
    const n = clientNameValue.toLowerCase()
    if (!n) return undefined
    return clients.find((c) => c.name.toLowerCase() === n)
  }, [clients, clientNameValue])

  const projectOptions = useMemo(() => {
    if (!selectedClient) return projects
    const filtered = projects.filter((p) => p.clientId === selectedClient.id)
    return filtered.length > 0 ? filtered : projects
  }, [projects, selectedClient])

  const topClients = useMemo(() => clients.slice(0, QUICK_PICK_LIMIT), [clients])
  const topProjects = useMemo(() => projectOptions.slice(0, QUICK_PICK_LIMIT), [projectOptions])
  const topTags = useMemo(() => tags.slice(0, QUICK_PICK_LIMIT), [tags])

  const handlePickClient = useCallback(
    (name: string) => {
      setValue('clientName', name, { shouldValidate: true })
    },
    [setValue]
  )

  const handlePickProject = useCallback(
    (name: string) => {
      setValue('projectName', name, { shouldValidate: true })
    },
    [setValue]
  )

  const handleAppendTag = useCallback(
    (tagName: string) => {
      const current = getValues('tags')?.trim() ?? ''
      const existing = current
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
      if (existing.includes(tagName.toLowerCase())) return
      setValue('tags', current ? `${current}, ${tagName}` : tagName, { shouldValidate: true })
    },
    [getValues, setValue]
  )

  const onSubmit = (data: TimeEntryInput) => {
    startTransition(async () => {
      await createTimeEntry(data)
      const currentDate = new Date().toISOString().split('T')[0]
      reset({ title: '', description: '', activityType: 'SUPPORTO', duration: 60, date: currentDate, clientName: '', projectName: '', tags: '' })
      setOre(1); setMinuti(0); setGiorni(1)
    })
  }

  const applyParsedToForm = (data: TimeEntryInput) => {
    setValue('title', data.title, { shouldValidate: true })
    setValue('description', data.description ?? '', { shouldValidate: true })
    setValue('activityType', data.activityType, { shouldValidate: true })
    setValue('duration', data.duration, { shouldValidate: true })
    setValue('date', data.date, { shouldValidate: true })
    setValue('clientName', data.clientName ?? '', { shouldValidate: true })
    setValue('projectName', data.projectName ?? '', { shouldValidate: true })
    setValue('tags', data.tags ?? '', { shouldValidate: true })
    if (data.activityType === 'FERIE') {
      setGiorni(Math.round(data.duration / 480 * 10) / 10)
    } else {
      setOre(Math.floor(data.duration / 60))
      setMinuti(data.duration % 60)
    }
  }

  const handleNlInterpret = () => {
    setNlError(null)
    startNlTransition(async () => {
      const result = await parseNaturalLanguageTimeEntry(nlText)
      if (!result.ok) {
        setNlError(result.message)
        return
      }
      applyParsedToForm(result.data)
    })
  }

  const handleNlInterpretAndSave = () => {
    setNlError(null)
    startNlTransition(async () => {
      const result = await parseNaturalLanguageTimeEntry(nlText)
      if (!result.ok) {
        setNlError(result.message)
        return
      }
      await createTimeEntry(result.data)
      setNlText('')
      reset({ date: today, duration: 60, activityType: 'SUPPORTO' })
    })
  }

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    const rec = createSpeechRecognition(
      (transcript) => setValue('description', transcript, { shouldValidate: true }),
      setIsListening
    )
    if (!rec) return
    recognitionRef.current = rec
    rec.start()
  }

  const toggleNlVoice = () => {
    if (isNlListening) {
      nlRecognitionRef.current?.stop()
      return
    }
    const rec = createSpeechRecognition(
      (transcript) => setNlText((prev) => `${prev ? `${prev} ` : ''}${transcript}`.trim()),
      setIsNlListening
    )
    if (!rec) return
    nlRecognitionRef.current = rec
    rec.start()
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Clock size={16} />
        Nuovo inserimento
      </h2>

      <div className={styles.cardBody}>
      <details className={styles.foldSection}>
        <summary className={styles.foldSummary}>
          <Sparkles size={14} aria-hidden className={styles.foldSummaryIcon} />
          Linguaggio naturale (AI)
        </summary>
        <div className={styles.foldBody}>
          <p className={styles.nlHint} id="nl-entry-hint">
            Esempi: «2h supporto ticket per Rossi Spa oggi» · «45min manutenzione deploy progetto Alpha» · «mezz&apos;ora meeting con cliente Bianchi, tag: riunione»
          </p>
          <div className={styles.nlTextareaWrap}>
            <textarea
              id="nl-entry-text"
              className={styles.nlTextarea}
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder="Descrivi attività, durata, cliente…"
              rows={2}
              aria-describedby="nl-entry-hint"
            />
            <button
              type="button"
              onClick={toggleNlVoice}
              className={`${styles.nlMicButton} ${isNlListening ? styles.micActive : ''}`}
              title={isNlListening ? 'Ferma dettatura' : 'Dettatura in questo campo'}
              aria-label={isNlListening ? 'Ferma dettatura' : 'Avvia dettatura nel campo linguaggio naturale'}
            >
              {isNlListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
          <div className={styles.nlActions}>
            <button
              type="button"
              className={styles.nlButton}
              disabled={isNlPending || isPending}
              onClick={handleNlInterpret}
              aria-busy={isNlPending}
            >
              <Sparkles size={14} aria-hidden />
              {isNlPending ? 'Interpretazione…' : 'Compila'}
            </button>
            <button
              type="button"
              className={styles.nlButtonPrimary}
              disabled={isNlPending || isPending}
              onClick={handleNlInterpretAndSave}
              aria-busy={isNlPending}
            >
              <Sparkles size={14} aria-hidden />
              {isNlPending ? 'Salvataggio…' : 'Compila e salva'}
            </button>
          </div>
          {nlError && (
            <p className={styles.nlError} role="alert">
              {nlError}
            </p>
          )}
        </div>
      </details>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.titleTypeRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="entry-title">
              Titolo *
            </label>
            <input
              id="entry-title"
              {...register('title')}
              className={styles.input}
              placeholder="Breve descrizione"
            />
            {errors.title && <p className={styles.error}>{errors.title.message}</p>}
          </div>
          <div className={styles.field}>
            <span className={styles.label} id="activity-type-label">
              Tipo *
            </span>
            <div
              className={styles.radioCol}
              role="radiogroup"
              aria-labelledby="activity-type-label"
            >
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
            </div>
            {errors.activityType && (
              <p className={styles.error}>{errors.activityType.message}</p>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="entry-description">
            Descrizione
          </label>
          <div className={styles.descriptionWrapper}>
            <textarea
              id="entry-description"
              {...register('description')}
              className={styles.textarea}
              rows={2}
              placeholder="Dettagli (o microfono)"
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={`${styles.micButton} ${isListening ? styles.micActive : ''}`}
              title={isListening ? 'Ferma registrazione' : 'Dettatura vocale'}
              aria-label={isListening ? 'Ferma dettatura' : 'Dettatura vocale'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Durata *</label>
            <input type="hidden" {...register('duration')} />
            {isFerie ? (
              <div className={styles.durationPair}>
                <input
                  type="number"
                  min={0.5}
                  max={30}
                  step={0.5}
                  value={giorni}
                  onChange={(e) => setGiorni(parseFloat(e.target.value) || 1)}
                  className={`${styles.input} ${styles.durationUnitInput}`}
                />
                <span className={styles.durationUnitLabel}>giorni</span>
              </div>
            ) : (
              <div className={styles.durationPair}>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={ore}
                  onChange={(e) => setOre(parseInt(e.target.value) || 0)}
                  className={`${styles.input} ${styles.durationUnitInput}`}
                />
                <span className={styles.durationUnitLabel}>h</span>
                <input
                  type="number"
                  min={0}
                  max={59}
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
            <input
              {...register('date')}
              type="date"
              className={styles.input}
            />
            {errors.date && <p className={styles.error}>{errors.date.message}</p>}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Cliente</label>
            <input
              {...register('clientName')}
              list="clients-list"
              className={styles.input}
              placeholder="Nuovo o esistente"
            />
            <datalist id="clients-list">
              {clients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Progetto</label>
            <input
              {...register('projectName')}
              list="projects-list"
              className={styles.input}
              placeholder="Nuovo o esistente"
            />
            <datalist id="projects-list">
              {projectOptions.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="entry-tags">
            Tag (virgola)
          </label>
          <input
            id="entry-tags"
            {...register('tags')}
            list="tags-list"
            className={styles.input}
            placeholder="bug-fix, meeting…"
          />
          <datalist id="tags-list">
            {tags.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>

        {(topClients.length > 0 || topProjects.length > 0 || topTags.length > 0) && (
          <details className={styles.foldSection}>
            <summary className={styles.foldSummary}>Suggerimenti rapidi</summary>
            <div className={styles.foldBody}>
              {topClients.length > 0 && (
                <div className={styles.chipBlock}>
                  <p className={styles.chipLegend}>Clienti</p>
                  <div className={styles.chipRow} role="group" aria-label="Suggerimenti cliente">
                    {topClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={styles.chip}
                        onClick={() => handlePickClient(c.name)}
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
                    Progetti
                    {selectedClient ? ` · ${selectedClient.name}` : ''}
                  </p>
                  <div className={styles.chipRow} role="group" aria-label="Suggerimenti progetto">
                    {topProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={styles.chip}
                        onClick={() => handlePickProject(p.name)}
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
                        onClick={() => handleAppendTag(t.name)}
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

        <button type="submit" disabled={isPending} className={styles.submitButton}>
          <Plus size={16} />
          {isPending ? 'Salvataggio...' : 'Aggiungi voce'}
        </button>
      </form>
      </div>
    </div>
  )
}
