'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/lib/auth-actions'
import styles from './Navbar.module.css'

/**
 * Prima di chiudere la sessione svuota Cache Storage: il service worker non memorizza più
 * pagine né risposte API, ma un browser aggiornato da una versione precedente può avere
 * ancora in cache dati dell'utente, che resterebbero leggibili dopo il logout.
 */
async function clearClientCaches() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    navigator.serviceWorker?.controller?.postMessage({ type: 'clear-cache' })
  } catch {
    // Cache Storage non disponibile (contesto non sicuro, storage bloccato): il logout procede
  }
}

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className={styles.navLink}
      title="Esci"
      aria-label="Esci"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await clearClientCaches()
          await logout()
        })
      }
    >
      <LogOut size={14} />
    </button>
  )
}
