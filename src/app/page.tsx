import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import TimeEntryForm from '@/components/TimeEntryForm'
import TimeEntryList from '@/components/TimeEntryList'
import FilterBar from '@/components/FilterBar'
import TaskBoard from '@/components/TaskBoard'
import ReminderList from '@/components/ReminderList'
import Navbar from '@/components/Navbar'
import { isAuthEnabled } from '@/lib/session'
import { activityTypeSchema } from '@/lib/schemas'
import { isoWeekRangeUtc } from '@/lib/dates'
import styles from './page.module.css'

const ITEMS_PER_PAGE = 5
const SUGGESTIONS_LIMIT = 20

async function getStats() {
  // Settimana ISO (lunedì → lunedì), coerente con /oggi e con il calendario
  const week = isoWeekRangeUtc()

  const [totalAggr, weekAggr, totalCount, clientCount] = await Promise.all([
    prisma.timeEntry.aggregate({ _sum: { duration: true } }),
    prisma.timeEntry.aggregate({
      where: { date: { gte: week.start, lt: week.end } },
      _sum: { duration: true },
    }),
    prisma.timeEntry.count(),
    prisma.client.count(),
  ])

  return {
    totalMin: totalAggr._sum.duration || 0,
    weekMin: weekAggr._sum.duration || 0,
    totalCount,
    clientCount,
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
  // Derivato dallo schema: non può divergere dalle opzioni della FilterBar né dall'export
  const parsedType = activityTypeSchema.safeParse(filters.type)
  if (parsedType.success) {
    where.activityType = parsedType.data
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
  const { totalMin, weekMin, totalCount, clientCount } = stats

  const totalHours = (totalMin / 60).toFixed(1)
  const weekHours = (weekMin / 60).toFixed(1)
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className={styles.page}>
      <Navbar showLogout={isAuthEnabled()} />

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
          <p className={styles.statValue}>{clientCount}</p>
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
