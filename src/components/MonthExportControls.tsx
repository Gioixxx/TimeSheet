'use client'

import { useMemo, useState } from 'react'
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
  const [monthValue, setMonthValue] = useState(currentMonthValue)

  const exportHref = useMemo(() => {
    const parsed = parseMonthValue(monthValue)
    if (!parsed) return '#'
    const params = new URLSearchParams({
      year: String(parsed.year),
      month: String(parsed.month),
    })
    return `/api/export?${params.toString()}`
  }, [monthValue])

  const parsed = parseMonthValue(monthValue)
  const disabled = !parsed

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
        aria-label="Seleziona mese per export CSV"
      />
      <a
        href={disabled ? '#' : exportHref}
        {...(!disabled ? { download: true } : {})}
        className={styles.downloadLink}
        aria-disabled={disabled}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
      >
        <Download size={14} aria-hidden />
        CSV
      </a>
    </div>
  )
}
