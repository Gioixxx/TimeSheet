'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, type AuthActionState } from '@/lib/auth-actions'
import styles from '@/components/AuthCard.module.css'

export default function LoginForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(login, undefined)
  // Path richiesto prima del redirect al login, impostato da src/proxy.ts.
  // La validazione (solo path interni) sta lato server in `login`.
  const from = useSearchParams().get('from') ?? ''

  return (
    <form action={action} className={styles.form}>
      {state?.error && <p className={styles.error}>{state.error}</p>}
      <input type="hidden" name="from" value={from} />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          className={styles.input}
          autoComplete="username"
          autoFocus
          required
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className={styles.input}
          autoComplete="current-password"
          required
        />
      </div>
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Accesso...' : 'Accedi'}
      </button>
    </form>
  )
}
