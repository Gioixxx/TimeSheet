import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { Sun, User, Briefcase, Wrench, HeadphonesIcon, Clock, TrendingUp } from 'lucide-react'
import TimeEntryForm from '@/components/TimeEntryForm'
import TaskBoard from '@/components/TaskBoard'
import ReminderList from '@/components/ReminderList'
import EditButton from '@/components/EditButton'
import DeleteButton from '@/components/DeleteButton'
import Navbar from '@/components/Navbar'
import styles from './page.module.css'

type ActivityType = 'SUPPORTO' | 'MANUTENZIONE' | 'PERMESSO' | 'FERIE' | 'STRAORDINARIO'

type IconComponent = typeof Wrench
function activityMeta(type: ActivityType): { label: string; Icon: IconComponent } {
  if (type === 'MANUTENZIONE') return { label: 'Manutenzione', Icon: Wrench }
  if (type === 'PERMESSO') return { label: 'Permesso', Icon: Clock }
  if (type === 'FERIE') return { label: 'Ferie', Icon: Sun }
  if (type === 'STRAORDINARIO') return { label: 'Straordinario', Icon: TrendingUp }
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

const SUGGESTIONS_LIMIT = 20

export default async function OggiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const rawDate = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : null
  const now = new Date()
  // Usa local midnight per evitare disallineamenti timezone (app locale)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  // Lunedì della settimana corrente (local)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7))

  const [entries, todayAggr, weekAggr, clients, projects, tags] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { date: { gte: startOfToday, lt: endOfToday } },
      include: { client: true, project: true, tags: true },
      orderBy: { date: 'desc' },
    }),
    prisma.timeEntry.aggregate({
      where: { date: { gte: startOfToday, lt: endOfToday } },
      _sum: { duration: true },
    }),
    prisma.timeEntry.aggregate({
      where: { date: { gte: startOfWeek } },
      _sum: { duration: true },
    }),
    prisma.client.findMany({ take: SUGGESTIONS_LIMIT, orderBy: { entries: { _count: 'desc' } } }),
    prisma.project.findMany({ take: SUGGESTIONS_LIMIT, orderBy: { entries: { _count: 'desc' } } }),
    prisma.tag.findMany({ take: SUGGESTIONS_LIMIT, orderBy: { entries: { _count: 'desc' } } }),
  ])

  const todayMin = todayAggr._sum.duration ?? 0
  const weekMin = weekAggr._sum.duration ?? 0
  const overtimeMin = Math.max(0, todayMin - 480)

  const todayHours = (todayMin / 60).toFixed(1)
  const weekHours = (weekMin / 60).toFixed(1)

  function formatOt(min: number): string {
    const h = Math.floor(min / 60)
    const m = min % 60
    if (h === 0) return `+${m}m`
    return m === 0 ? `+${h}h` : `+${h}h ${m}m`
  }

  // Breakdown per tipo attività
  const breakdown = new Map<ActivityType, number>()
  for (const e of entries) {
    const prev = breakdown.get(e.activityType) ?? 0
    breakdown.set(e.activityType, prev + e.duration)
  }
  const breakdownItems = Array.from(breakdown.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, min]) => `${formatDuration(min, type)} ${activityMeta(type).label}`)

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore oggi</p>
          <p className={styles.statValue}>
            {todayHours}
            <span className={styles.statUnit}>h</span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Voci oggi</p>
          <p className={styles.statValue}>{entries.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Breakdown</p>
          <p className={styles.statValueSmall}>
            {breakdownItems.length > 0 ? breakdownItems.join(' · ') : '—'}
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Questa settimana</p>
          <p className={styles.statValue}>
            {weekHours}
            <span className={styles.statUnit}>h</span>
          </p>
        </div>
        {overtimeMin > 0 && (
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Straordinari</p>
            <p className={styles.statValue}>{formatOt(overtimeMin)}</p>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.formColumn}>
          <TimeEntryForm clients={clients} projects={projects} tags={tags} defaultDate={rawDate ?? undefined} />
        </div>
        <div className={styles.listColumn}>
          <ReminderList />
          <Suspense>
            <TaskBoard />
          </Suspense>

          <div className={styles.todayList}>
            <h2 className={styles.listHeader}>
              <Sun size={15} />
              Voci di oggi
              {entries.length > 0 && (
                <span className={styles.listCount}>{entries.length}</span>
              )}
            </h2>

            {entries.length === 0 ? (
              <p className={styles.empty}>Nessuna voce oggi. Inizia a tracciare!</p>
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
        </div>
      </div>
    </div>
  )
}
