'use client'

import { useEffect } from 'react'

const POLL_INTERVAL = 60_000 // 1 minuto

type ReminderPayload = {
  id: string
  title: string
  notes: string | null
}

export default function NotificationManager() {
  useEffect(() => {
    // In Electron le notifiche OS sono gestite dal main process — evito duplicati
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) return

    if (!('Notification' in window)) return

    const requestAndPoll = async () => {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }

      if (Notification.permission !== 'granted') return

      const poll = async () => {
        try {
          const res = await fetch('/api/reminders/upcoming')
          if (!res.ok) return
          const reminders: ReminderPayload[] = await res.json()

          for (const reminder of reminders) {
            new Notification(reminder.title, {
              body: reminder.notes ?? undefined,
              icon: '/icon.svg',
              tag: `reminder-${reminder.id}`,
            })
            // Marca come notificato (fire-and-forget)
            fetch(`/api/reminders/${reminder.id}/notified`, { method: 'POST' }).catch(() => {})
          }
        } catch {
          // Ignora errori di rete
        }
      }

      poll()
      const id = setInterval(poll, POLL_INTERVAL)
      return id
    }

    let intervalId: ReturnType<typeof setInterval> | undefined
    requestAndPoll().then((id) => { intervalId = id })

    return () => {
      if (intervalId !== undefined) clearInterval(intervalId)
    }
  }, [])

  return null
}
