import { prisma } from '@/lib/prisma'
import { StickyNote } from 'lucide-react'
import TaskCard from './TaskCard'
import AddTaskForm from './AddTaskForm'
import styles from './TaskBoard.module.css'

export type SuggestionLists = {
  clients: { id: string; name: string }[]
  projects: { id: string; name: string; clientId: string | null }[]
  tags: { id: string; name: string }[]
}

/**
 * Le liste di suggerimenti arrivano come props dalla pagina, che le ha già caricate per il
 * form di inserimento manuale: il dialog di registrazione offre gli stessi datalist e le
 * stesse scelte rapide, senza ripetere le query.
 */
export default async function TaskBoard({ clients, projects, tags }: SuggestionLists) {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div className={styles.board}>
      <div className={styles.boardHeader}>
        <h2 className={styles.boardTitle}>
          <StickyNote size={15} />
          Attività
          {tasks.length > 0 && (
            <span className={styles.boardCount}>{tasks.length}</span>
          )}
        </h2>
        <AddTaskForm clients={clients} projects={projects} />
      </div>

      {tasks.length === 0 ? (
        <p className={styles.boardEmpty}>
          Nessuna attività. Aggiungi un post-it per tenere traccia di cosa fare.
        </p>
      ) : (
        <ul className={styles.cardList}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              clients={clients}
              projects={projects}
              tags={tags}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
