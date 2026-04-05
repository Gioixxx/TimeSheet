import { prisma } from '@/lib/prisma'
import TimeEntryForm from '@/components/TimeEntryForm'
import TimeEntryList from '@/components/TimeEntryList'
import styles from './page.module.css'

const ITEMS_PER_PAGE = 5
const SUGGESTIONS_LIMIT = 20

async function getStats() {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const [totalAggr, weekAggr, totalCount] = await Promise.all([
    prisma.timeEntry.aggregate({ _sum: { duration: true } }),
    prisma.timeEntry.aggregate({
      where: { date: { gte: startOfWeek } },
      _sum: { duration: true },
    }),
    prisma.timeEntry.count(),
  ])

  return {
    totalMin: totalAggr._sum.duration || 0,
    weekMin: weekAggr._sum.duration || 0,
    totalCount,
  }
}

async function getData(page: number) {
  const [entries, clients, projects, tags] = await Promise.all([
    prisma.timeEntry.findMany({
      take: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
      include: { client: true, project: true, tags: true },
      orderBy: { date: 'desc' },
    }),
    prisma.client.findMany({
      take: SUGGESTIONS_LIMIT,
      orderBy: { entries: { _count: 'desc' } },
    }),
    prisma.project.findMany({
      take: SUGGESTIONS_LIMIT,
      orderBy: { entries: { _count: 'desc' } },
    }),
    prisma.tag.findMany({
      take: SUGGESTIONS_LIMIT,
      orderBy: { entries: { _count: 'desc' } },
    }),
  ])
  return { entries, clients, projects, tags }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = Number(params?.page) || 1

  const [data, stats] = await Promise.all([
    getData(page),
    getStats()
  ])

  const { entries, clients, projects, tags } = data
  const { totalMin, weekMin, totalCount } = stats

  const totalHours = (totalMin / 60).toFixed(1)
  const weekHours = (weekMin / 60).toFixed(1)
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Time<span className={styles.titleAccent}>sheet</span>
        </h1>
        <p className={styles.subtitle}>Traccia il tuo tempo, locally.</p>
      </header>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Voci totali</p>
          <p className={styles.statValue}>{totalCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ore totali</p>
          <p className={styles.statValue}>
            {totalHours}
            <span className={styles.statUnit}>h</span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Questa settimana</p>
          <p className={styles.statValue}>
            {weekHours}
            <span className={styles.statUnit}>h</span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Clienti</p>
          <p className={styles.statValue}>{clients.length}</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.formColumn}>
          <TimeEntryForm clients={clients} projects={projects} tags={tags} />
        </div>
        <div className={styles.listColumn}>
          <TimeEntryList
            entries={entries}
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        </div>
      </div>
    </div>
  )
}
