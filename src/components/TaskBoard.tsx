import { prisma } from '@/lib/prisma'
import { StickyNote } from 'lucide-react'
import TaskCard from './TaskCard'
import AddTaskForm from './AddTaskForm'
import styles from './TaskBoard.module.css'

export default async function TaskBoard() {
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
        <AddTaskForm />
      </div>

      {tasks.length === 0 ? (
        <p className={styles.boardEmpty}>
          Nessuna attività. Aggiungi un post-it per tenere traccia di cosa fare.
        </p>
      ) : (
        <ul className={styles.cardList}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  )
}
