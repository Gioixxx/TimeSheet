'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X, User, Briefcase, Calendar, Wrench, HeadphonesIcon, Sun, Clock } from 'lucide-react'
import styles from './SearchBar.module.css'

type ActivityType = 'SUPPORTO' | 'MANUTENZIONE' | 'PERMESSO' | 'FERIE'

type Entry = {
  id: string
  title: string
  description: string | null
  activityType: ActivityType
  duration: number
  date: string
  client: { id: string; name: string } | null
  project: { id: string; name: string } | null
  tags: { id: string; name: string }[]
}

function activityIcon(type: ActivityType) {
  if (type === 'MANUTENZIONE') return <Wrench size={11} />
  if (type === 'PERMESSO') return <Clock size={11} />
  if (type === 'FERIE') return <Sun size={11} />
  return <HeadphonesIcon size={11} />
}

function activityLabel(type: ActivityType) {
  if (type === 'MANUTENZIONE') return 'Manutenzione'
  if (type === 'PERMESSO') return 'Permesso'
  if (type === 'FERIE') return 'Ferie'
  return 'Supporto'
}

function formatDuration(minutes: number, type: ActivityType) {
  if (type === 'FERIE') {
    const g = minutes / 480
    return Number.isInteger(g) ? `${g}g` : `${g.toFixed(1)}g`
  }
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function clear() {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrap}>
        <Search size={13} className={styles.icon} />
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder="Cerca voci..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          aria-label="Ricerca globale"
          autoComplete="off"
        />
        {query && (
          <button className={styles.clearBtn} onClick={clear} aria-label="Cancella ricerca">
            <X size={12} />
          </button>
        )}
      </div>

      {open && (
        <div className={styles.dropdown} role="listbox">
          {loading && <p className={styles.hint}>Ricerca in corso...</p>}

          {!loading && results.length === 0 && (
            <p className={styles.hint}>Nessun risultato per &ldquo;{query}&rdquo;</p>
          )}

          {!loading && results.map((entry) => (
            <div key={entry.id} className={styles.result} role="option">
              <div className={styles.resultTop}>
                <span className={styles.resultTitle}>{entry.title}</span>
                <div className={styles.resultRight}>
                  <span className={styles.badge}>
                    {activityIcon(entry.activityType)}
                    {activityLabel(entry.activityType)}
                  </span>
                  <span className={styles.duration}>
                    {formatDuration(entry.duration, entry.activityType)}
                  </span>
                </div>
              </div>

              {entry.description && (
                <p className={styles.description}>{entry.description}</p>
              )}

              <div className={styles.meta}>
                {entry.client && (
                  <span className={styles.metaChip}>
                    <User size={10} />
                    {entry.client.name}
                  </span>
                )}
                {entry.project && (
                  <span className={styles.metaChip}>
                    <Briefcase size={10} />
                    {entry.project.name}
                  </span>
                )}
                <span className={styles.metaChip}>
                  <Calendar size={10} />
                  {formatDate(entry.date)}
                </span>
              </div>

              {entry.tags.length > 0 && (
                <div className={styles.tags}>
                  {entry.tags.map((t) => (
                    <span key={t.id} className={styles.tag}>#{t.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
