import { List, User, Briefcase, Calendar, Wrench, HeadphonesIcon } from 'lucide-react'
import DeleteButton from './DeleteButton'
import MonthExportControls from './MonthExportControls'
import Pagination from './Pagination'
import styles from './TimeEntryList.module.css'

const ITEMS_PER_PAGE = 5

type Tag = { id: string; name: string }
type Client = { id: string; name: string }
type Project = { id: string; name: string }

type ActivityType = 'SUPPORTO' | 'MANUTENZIONE'

type Entry = {
  id: string
  title: string
  description: string | null
  activityType: ActivityType
  duration: number
  date: Date
  client: Client | null
  project: Project | null
  tags: Tag[]
}

function activityMeta(type: ActivityType): { label: string; Icon: typeof Wrench } {
  if (type === 'MANUTENZIONE') return { label: 'Manutenzione', Icon: Wrench }
  return { label: 'Supporto', Icon: HeadphonesIcon }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default function TimeEntryList({
  entries,
  currentPage,
  totalPages,
  totalCount,
}: {
  entries: Entry[]
  currentPage: number
  totalPages: number
  totalCount: number
}) {
  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          <List size={16} />
          Storico
        </h2>
        <div className={styles.headerActions}>
          <MonthExportControls />
          <span className={styles.count}>{totalCount} voc{totalCount === 1 ? 'e' : 'i'}</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>Nessun inserimento ancora. Aggiungi la prima voce!</p>
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
                    <span className={styles.duration}>{formatDuration(entry.duration)}</span>
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
                  {(entry.client || entry.project) && (
                    <span className={styles.metaSep}>•</span>
                  )}
                  <span className={styles.metaChip}>
                    <Calendar size={11} />
                    {formatDate(entry.date)}
                  </span>
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

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}
    </div>
  )
}
