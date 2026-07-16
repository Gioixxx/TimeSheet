'use client'

import { useActionState } from 'react'
import { createFirstUser, type AuthActionState } from '@/lib/auth-actions'
import styles from '@/components/AuthCard.module.css'

export default function SetupForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    createFirstUser,
    undefined
  )

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
          placeholder="es. giuseppe"
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
          placeholder="Minimo 8 caratteri"
          autoComplete="new-password"
          required
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="confirmPassword">
          Conferma password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className={styles.input}
          autoComplete="new-password"
          required
        />
      </div>
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Creazione...' : 'Crea account'}
      </button>
    </form>
  )
}
