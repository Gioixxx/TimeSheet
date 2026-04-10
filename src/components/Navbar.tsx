'use client'
import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { List, CalendarDays, Sun } from 'lucide-react'
import SearchBar from './SearchBar'
import { ThemeSelector } from './ThemeSelector'
import styles from './Navbar.module.css'

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

export default function Navbar({ centerSlot }: { centerSlot?: React.ReactNode }) {
  const pathname = usePathname()
  const now = new Date()
  const dateLabel = `${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>
          Time<span className={styles.titleAccent}>sheet</span>
        </h1>
        <p className={styles.subtitle}>{dateLabel}</p>
      </div>
      {centerSlot ?? <SearchBar />}
      <nav className={styles.nav}>
        {pathname === '/' ? (
          <span className={styles.navLinkActive}><List size={14} />Lista</span>
        ) : (
          <Link href="/" className={styles.navLink}><List size={14} />Lista</Link>
        )}
        {pathname === '/calendario' ? (
          <span className={styles.navLinkActive}><CalendarDays size={14} />Calendario</span>
        ) : (
          <Link href="/calendario" className={styles.navLink}><CalendarDays size={14} />Calendario</Link>
        )}
        {pathname === '/oggi' ? (
          <span className={styles.navLinkActive}><Sun size={14} />Oggi</span>
        ) : (
          <Link href="/oggi" className={styles.navLink}><Sun size={14} />Oggi</Link>
        )}
        <ThemeSelector />
      </nav>
    </header>
  )
}
