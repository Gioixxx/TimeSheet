'use client';

import { List, User, Briefcase, Calendar, Wrench, HeadphonesIcon, Sun, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import DeleteButton from './DeleteButton'
import EditButton from './EditButton'
import MonthExportControls from './MonthExportControls'
import Pagination from './Pagination'
import styles from './TimeEntryList.module.css'

const ITEMS_PER_PAGE = 5

type Tag = { id: string; name: string }
type Client = { id: string; name: string }
type Project = { id: string; name: string }

type ActivityType = 'SUPPORTO' | 'MANUTENZIONE' | 'PERMESSO' | 'FERIE'

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
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => {
              const { label, Icon } = activityMeta(entry.activityType)
              return (
                <motion.li 
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  key={entry.id} 
                  className={styles.entry}
                >
                  <div className={styles.entryTop}>
                  <span className={styles.entryTitle}>{entry.title}</span>
                  <div className={styles.entryRight}>
                    <span className={styles.activityBadge} title={label}>
                      <Icon size={12} aria-hidden />
                      {label}
                    </span>
                    <span className={styles.duration}>{formatDuration(entry.duration, entry.activityType)}</span>
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
                </motion.li>
              )
            })}
          </AnimatePresence>
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
