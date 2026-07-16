import type { ReactNode } from 'react'
import styles from './AuthCard.module.css'

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
      </div>
    </div>
  )
}
