'use client'

import { useActionState } from 'react'
import { login, type AuthActionState } from '@/lib/auth-actions'
import styles from '@/components/AuthCard.module.css'

export default function LoginForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(login, undefined)

  return (
    <form action={action} className={styles.form}>
      {state?.error && <p className={styles.error}>{state.error}</p>}
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
