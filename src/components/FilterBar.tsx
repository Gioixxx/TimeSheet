'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'
import styles from './FilterBar.module.css'

type Props = {
  clients: { id: string; name: string }[]
}

export default function FilterBar({ clients }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete('page')
      router.push(`/?${next.toString()}`)
    },
    [router, params]
  )

  const hasFilters = params.has('month') || params.has('type') || params.has('client')

  const reset = () => router.push('/')

  return (
    <div className={styles.bar}>
      <input
        type="month"
        className={styles.input}
        value={params.get('month') ?? ''}
        onChange={(e) => update('month', e.target.value)}
        aria-label="Filtra per mese"
      />

      <select
        className={styles.select}
        value={params.get('type') ?? ''}
        onChange={(e) => update('type', e.target.value)}
        aria-label="Filtra per tipo"
      >
        <option value="">Tutti i tipi</option>
        <option value="SUPPORTO">Supporto</option>
        <option value="MANUTENZIONE">Manutenzione</option>
      </select>

      <select
        className={styles.select}
        value={params.get('client') ?? ''}
        onChange={(e) => update('client', e.target.value)}
        aria-label="Filtra per cliente"
      >
        <option value="">Tutti i clienti</option>
        {clients.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button className={styles.resetBtn} onClick={reset} title="Rimuovi filtri">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
