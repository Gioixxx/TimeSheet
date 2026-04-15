import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import TimeEntryForm from '@/components/TimeEntryForm'
import TimeEntryList from '@/components/TimeEntryList'
import FilterBar from '@/components/FilterBar'
import TaskBoard from '@/components/TaskBoard'
import ReminderList from '@/components/ReminderList'
import Navbar from '@/components/Navbar'
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

type Filters = {
  month?: string
  type?: string
  client?: string
}

async function getData(page: number, filters: Filters) {
  const where: NonNullable<Parameters<typeof prisma.timeEntry.findMany>[0]>['where'] = {}

  if (filters.month) {
    const [y, m] = filters.month.split('-').map(Number)
    where.date = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    }
  }
  const validTypes = ['SUPPORTO', 'MANUTENZIONE', 'PERMESSO', 'FERIE']
  if (filters.type && validTypes.includes(filters.type)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.activityType = filters.type as any
  }
  if (filters.client) {
    where.client = { name: filters.client }
  }

  const [entries, total, clients, projects, tags] = await Promise.all([
    prisma.timeEntry.findMany({
      take: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
      where,
      include: { client: true, project: true, tags: true },
      orderBy: { date: 'desc' },
    }),
    prisma.timeEntry.count({ where }),
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
  return { entries, total, clients, projects, tags }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = Number(params?.page) || 1
  const filters: Filters = {
    month: typeof params.month === 'string' ? params.month : undefined,
    type: typeof params.type === 'string' ? params.type : undefined,
    client: typeof params.client === 'string' ? params.client : undefined,
  }

  const [data, stats] = await Promise.all([
    getData(page, filters),
    getStats(),
  ])

  const { entries, total, clients, projects, tags } = data
  const { totalMin, weekMin, totalCount } = stats

  const totalHours = (totalMin / 60).toFixed(1)
  const weekHours = (weekMin / 60).toFixed(1)
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className={styles.page}>
      <Navbar />

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
          <ReminderList />
          <TaskBoard />
          <Suspense>
            <FilterBar clients={clients} />
          </Suspense>
          <TimeEntryList
            entries={entries}
            currentPage={page}
            totalPages={totalPages}
            totalCount={total}
          />
        </div>
      </div>
    </div>
  )
}
