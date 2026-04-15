import { prisma } from '@/lib/prisma'
import { Bell, RefreshCw } from 'lucide-react'
import ReminderForm from './ReminderForm'
import ReminderActions from './ReminderActions'
import { recurrenceLabel } from '@/lib/reminder-recurrence'
import styles from './ReminderBoard.module.css'

function formatDateTime(date: Date): string {
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  const isTomorrow = (() => {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return (
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate()
    )
  })()

  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `oggi ${time}`
  if (isTomorrow) return `domani ${time}`
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ReminderList() {
  const now = new Date()
  const reminders = await prisma.reminder.findMany({
    where: { isCompleted: false },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <div className={styles.board}>
      <div className={styles.boardHeader}>
        <h2 className={styles.boardTitle}>
          <Bell size={15} />
          Reminder
          {reminders.length > 0 && (
            <span className={styles.boardCount}>{reminders.length}</span>
          )}
        </h2>
        <ReminderForm />
      </div>

      {reminders.length === 0 ? (
        <p className={styles.boardEmpty}>
          Nessun reminder. Aggiungi un promemoria con orario.
        </p>
      ) : (
        <ul className={styles.reminderList}>
          {reminders.map((r) => {
            const isPast = r.scheduledAt <= now
            const isNotified = r.notifiedAt !== null
            const recLabel = recurrenceLabel(r.recurrence)
            return (
              <li
                key={r.id}
                className={`${styles.reminderItem} ${isPast ? styles.reminderPast : ''}`}
              >
                <div className={styles.reminderTop}>
                  <span className={styles.reminderTitle}>{r.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {recLabel && (
                      <span className={styles.recurrenceBadge}>
                        <RefreshCw size={9} />
                        {recLabel}
                      </span>
                    )}
                    <span className={`${styles.reminderTime} ${isPast ? styles.reminderTimeOverdue : ''}`}>
                      {isPast ? '⚠ ' : ''}{formatDateTime(r.scheduledAt)}
                    </span>
                  </div>
                </div>
                {r.notes && <p className={styles.reminderNotes}>{r.notes}</p>}
                {isNotified && !r.recurrence && (
                  <span className={styles.reminderNotifiedBadge}>✓ Notificato</span>
                )}
                <ReminderActions reminder={{
                  id: r.id,
                  title: r.title,
                  notes: r.notes,
                  scheduledAt: r.scheduledAt,
                  recurrence: r.recurrence,
                  recurrenceEnd: r.recurrenceEnd,
                }} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
