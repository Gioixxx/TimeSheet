'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download } from 'lucide-react'
import styles from './MonthExportControls.module.css'

function currentMonthValue(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function parseMonthValue(value: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

export default function MonthExportControls() {
  const searchParams = useSearchParams()

  // Il mese di export segue il filtro attivo se presente, altrimenti il mese corrente.
  const initialMonth = searchParams.get('month') || currentMonthValue()
  const [monthValue, setMonthValue] = useState(initialMonth)

  const activeType = searchParams.get('type') ?? ''
  const activeClient = searchParams.get('client') ?? ''

  const parsed = parseMonthValue(monthValue)
  const disabled = !parsed

  const hrefFor = useMemo(() => {
    return (format: 'csv' | 'xlsx') => {
      if (!parsed) return '#'
      const params = new URLSearchParams({
        year: String(parsed.year),
        month: String(parsed.month),
        format,
      })
      if (activeType) params.set('type', activeType)
      if (activeClient) params.set('client', activeClient)
      return `/api/export?${params.toString()}`
    }
  }, [parsed, activeType, activeClient])

  return (
    <div className={styles.wrap}>
      <label className={styles.label} htmlFor="export-month">
        Export mese
      </label>
      <input
        id="export-month"
        type="month"
        className={styles.monthInput}
        value={monthValue}
        onChange={(e) => setMonthValue(e.target.value)}
        aria-label="Seleziona mese per export"
      />
      <a
        href={disabled ? '#' : hrefFor('csv')}
        {...(!disabled ? { download: true } : {})}
        className={styles.downloadLink}
        aria-disabled={disabled}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
      >
        <Download size={14} aria-hidden />
        CSV
      </a>
      <a
        href={disabled ? '#' : hrefFor('xlsx')}
        {...(!disabled ? { download: true } : {})}
        className={styles.downloadLink}
        aria-disabled={disabled}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
      >
        <Download size={14} aria-hidden />
        Excel
      </a>
    </div>
  )
}
