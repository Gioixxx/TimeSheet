import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Sun, User, Briefcase, Wrench, HeadphonesIcon, Clock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import styles from './page.module.css'

type ActivityType = 'SUPPORTO' | 'MANUTENZIONE' | 'PERMESSO' | 'FERIE'

type IconComponent = typeof Wrench
function activityMeta(type: ActivityType): { label: string; Icon: IconComponent } {
  if (type === 'MANUTENZIONE') return { label: 'Manutenzione', Icon: Wrench }
  if (type === 'PERMESSO') return { label: 'Permesso', Icon: Clock }
  if (type === 'FERIE') return { label: 'Ferie', Icon: Sun }
  return { label: 'Supporto', Icon: HeadphonesIcon }
}

function formatDuration(minutes: number, activityType: ActivityType): string {
  if (activityType === 'FERIE') {
    const giorni = minutes / 480
    return Number.isInteger(giorni) ? `${giorni}g` : `${giorni.toFixed(1)}g`
  }
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const DAY_NAMES_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

export default async function CalendarioGiornoPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params

  // Validate YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) notFound()

  const startOfDay = new Date(Date.UTC(year, month - 1, day))
  const endOfDay = new Date(Date.UTC(year, month - 1, day + 1))

  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: startOfDay, lt: endOfDay } },
    include: { client: true, project: true, tags: true },
    orderBy: { date: 'desc' },
  })

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  const breakdown = new Map<ActivityType, number>()
  for (const e of entries) {
    const prev = breakdown.get(e.activityType) ?? 0
    breakdown.set(e.activityType, prev + e.duration)
  }
  const breakdownItems = Array.from(breakdown.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, min]) => `${formatDuration(min, type)} ${activityMeta(type).label}`)

  const jsDate = startOfDay
  const dayName = DAY_NAMES_IT[jsDate.getUTCDay()]
  const monthName = MONTH_NAMES_IT[month - 1]
  const dateLabel = `${dayName} ${day} ${monthName} ${year}`

  const monthParam = `${String(year)}-${String(month).padStart(2, '0')}`

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.header}>
        <Link href={`/calendario?month=${monthParam}`} className={styles.backLink}>
          <ChevronLeft size={14} />
          Calendario
        </Link>
        <h1 className={styles.dateTitle}>{dateLabel}</h1>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore totali</p>
          <p className={styles.statValue}>
            {totalHours}<span className={styles.statUnit}>h</span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Voci</p>
          <p className={styles.statValue}>{entries.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Breakdown</p>
          <p className={styles.statValueSmall}>
            {breakdownItems.length > 0 ? breakdownItems.join(' · ') : '—'}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>Nessuna voce registrata per questo giorno.</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => {
            const { label, Icon } = activityMeta(entry.activityType)
            return (
              <li key={entry.id} className={styles.entry}>
                <div className={styles.entryTop}>
                  <span className={styles.entryTitle}>{entry.title}</span>
                  <div className={styles.entryRight}>
                    <span className={styles.activityBadge} title={label}>
                      <Icon size={12} aria-hidden />
                      {label}
                    </span>
                    <span className={styles.duration}>
                      {formatDuration(entry.duration, entry.activityType)}
                    </span>
                    <EditButton
                      entry={{
                        id: entry.id,
                        title: entry.title,
                        description: entry.description,
                        activityType: entry.activityType,
                        duration: entry.duration,
                        date: entry.date,
                        clientName: entry.client?.name ?? null,
                        projectName: entry.project?.name ?? null,
                        tags: entry.tags.map((t) => t.name),
                      }}
                    />
                    <DeleteButton id={entry.id} />
                  </div>
                </div>

                {entry.description && (
                  <p className={styles.description}>{entry.description}</p>
                )}

                <div className={styles.entryMeta}>
                  {entry.client && (
                    <span className={styles.metaChip}>
                      <User size={11} />
                      {entry.client.name}
                    </span>
                  )}
                  {entry.client && entry.project && (
                    <span className={styles.metaSep}>›</span>
                  )}
                  {entry.project && (
                    <span className={styles.metaChip}>
                      <Briefcase size={11} />
                      {entry.project.name}
                    </span>
                  )}
                </div>

                {entry.tags.length > 0 && (
                  <div className={styles.tagList}>
                    {entry.tags.map((tag) => (
                      <span key={tag.id} className={styles.tag}>#{tag.name}</span>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
