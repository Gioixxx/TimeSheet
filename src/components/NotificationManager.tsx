'use client'

import { useEffect } from 'react'

const POLL_INTERVAL = 60_000 // 1 minuto

type ReminderPayload = {
  id: string
  title: string
  notes: string | null
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()

    function tone(freq: number, start: number, duration: number) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.start(start)
      osc.stop(start + duration)
    }

    const t = ctx.currentTime
    tone(880, t, 0.35)        // La5 — primo ding
    tone(660, t + 0.18, 0.45) // Mi5 — secondo ding

    setTimeout(() => ctx.close(), 1200)
  } catch {
    // Web Audio API non disponibile
  }
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

          if (reminders.length > 0) playNotificationSound()

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
