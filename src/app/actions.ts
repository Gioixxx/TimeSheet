'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { timeEntrySchema } from '@/lib/schemas'
import { todayLocalIso } from '@/lib/dates'
import { nextOccurrence, parseRecurrenceRule } from '@/lib/reminder-recurrence'
import { verifySession } from '@/lib/dal'
import {
  parseNaturalLanguageToTimeEntry,
  type ParseNlResult,
} from '@/lib/parse-nl-time-entry'

async function resolveRelations(data: ReturnType<typeof timeEntrySchema.parse>) {
  let clientId: string | undefined
  if (data.clientName?.trim()) {
    const client = await prisma.client.upsert({
      where: { name: data.clientName.trim() },
      update: {},
      create: { name: data.clientName.trim() },
    })
    clientId = client.id
  }

  let projectId: string | undefined
  if (data.projectName?.trim()) {
    const existing = await prisma.project.findFirst({
      where: { name: data.projectName.trim(), clientId: clientId ?? null },
    })
    const project =
      existing ??
      (await prisma.project.create({
        data: { name: data.projectName.trim(), clientId: clientId ?? null },
      }))
    projectId = project.id
  }

  const tagNames = (data.tags ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  const tagRecords = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
    )
  )

  return { clientId, projectId, tagRecords }
}

export async function createTimeEntry(raw: unknown) {
  await verifySession()
  const data = timeEntrySchema.parse(raw)
  const { clientId, projectId, tagRecords } = await resolveRelations(data)

  await prisma.timeEntry.create({
    data: {
      title: data.title,
      description: data.description,
      activityType: data.activityType,
      duration: data.duration,
      date: new Date(data.date),
      clientId: clientId ?? null,
      projectId: projectId ?? null,
      tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
    },
  })

  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

export async function updateTimeEntry(id: string, raw: unknown) {
  await verifySession()
  const data = timeEntrySchema.parse(raw)
  const { clientId, projectId, tagRecords } = await resolveRelations(data)

  await prisma.timeEntry.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      activityType: data.activityType,
      duration: data.duration,
      date: new Date(data.date),
      clientId: clientId ?? null,
      projectId: projectId ?? null,
      tags: { set: tagRecords.map((t) => ({ id: t.id })) },
    },
  })

  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

export async function deleteTimeEntry(id: string) {
  await verifySession()
  await prisma.timeEntry.delete({ where: { id } })
  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

// ── Task actions ────────────────────────────────────────────────────────────

import { z } from 'zod'

const taskSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  notes: z.string().optional(),
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  estimatedMinutes: z.coerce.number().int().min(1).max(99999).optional(),
})

export async function createTask(raw: unknown) {
  await verifySession()
  const data = taskSchema.parse(raw)
  await prisma.task.create({
    data: {
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      clientName: data.clientName?.trim() || null,
      projectName: data.projectName?.trim() || null,
      estimatedMinutes: data.estimatedMinutes ?? null,
    },
  })
  revalidatePath('/')
}

export async function deleteTask(id: string) {
  await verifySession()
  await prisma.task.delete({ where: { id } })
  revalidatePath('/')
}

export async function updateTask(id: string, raw: unknown) {
  await verifySession()
  const data = taskSchema.parse(raw)
  await prisma.task.update({
    where: { id },
    data: {
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      clientName: data.clientName?.trim() || null,
      projectName: data.projectName?.trim() || null,
      estimatedMinutes: data.estimatedMinutes ?? null,
    },
  })
  revalidatePath('/')
}

export async function logTaskAsEntry(
  taskId: string,
  duration: number,
  date: string,
  activityType: 'SUPPORTO' | 'MANUTENZIONE',
  description?: string
) {
  await verifySession()
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } })
  const entryData = timeEntrySchema.parse({
    title: task.title,
    description: description ?? task.notes ?? undefined,
    activityType,
    duration,
    date,
    clientName: task.clientName ?? undefined,
    projectName: task.projectName ?? undefined,
  })
  const { clientId, projectId, tagRecords } = await resolveRelations(entryData)
  await prisma.$transaction([
    prisma.timeEntry.create({
      data: {
        title: entryData.title,
        description: entryData.description,
        activityType: entryData.activityType,
        duration: entryData.duration,
        date: new Date(entryData.date),
        clientId: clientId ?? null,
        projectId: projectId ?? null,
        tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      },
    }),
    prisma.task.delete({ where: { id: taskId } }),
  ])
  revalidatePath('/')
}

// ── Reminder actions ─────────────────────────────────────────────────────────

const reminderSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  notes: z.string().optional(),
  scheduledAt: z.string().datetime(),
  recurrence: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).nullable().optional(),
  recurrenceEnd: z.string().datetime().nullable().optional(),
})

export async function createReminder(raw: unknown) {
  await verifySession()
  const data = reminderSchema.parse(raw)
  await prisma.reminder.create({
    data: {
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      scheduledAt: new Date(data.scheduledAt),
      recurrence: data.recurrence ?? null,
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
    },
  })
  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

export async function updateReminder(id: string, raw: unknown) {
  await verifySession()
  const data = reminderSchema.parse(raw)
  await prisma.reminder.update({
    where: { id },
    data: {
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      scheduledAt: new Date(data.scheduledAt),
      recurrence: data.recurrence ?? null,
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
      // Reset notifiedAt così la prossima occorrenza viene ricalcolata
      notifiedAt: null,
    },
  })
  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

export async function deleteReminder(id: string) {
  await verifySession()
  await prisma.reminder.delete({ where: { id } })
  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

/**
 * Segna come completata la *singola occorrenza* corrente.
 *
 * Su un reminder ricorrente `isCompleted` chiuderebbe l'intera serie per sempre: al suo posto
 * si avanza `notifiedAt` all'occorrenza appena spuntata, così `nextOccurrence()` restituisce
 * la successiva. La serie viene chiusa solo quando non ci sono più occorrenze (oltre
 * `recurrenceEnd`). Per terminare una serie ancora attiva c'è `completeReminderSeries`.
 */
export async function completeReminder(id: string) {
  await verifySession()

  const reminder = await prisma.reminder.findUniqueOrThrow({ where: { id } })
  const rule = parseRecurrenceRule(reminder.recurrence)

  if (!rule) {
    await prisma.reminder.update({ where: { id }, data: { isCompleted: true } })
  } else {
    const current = nextOccurrence(reminder)
    if (current === null) {
      // Serie già esaurita: non resta nulla da spuntare
      await prisma.reminder.update({ where: { id }, data: { isCompleted: true } })
    } else {
      const advanced = { ...reminder, notifiedAt: current }
      const hasMore = nextOccurrence(advanced) !== null
      await prisma.reminder.update({
        where: { id },
        data: hasMore ? { notifiedAt: current } : { notifiedAt: current, isCompleted: true },
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

/** Chiude l'intera serie ricorrente (o il singolo reminder), senza altre occorrenze. */
export async function completeReminderSeries(id: string) {
  await verifySession()
  await prisma.reminder.update({ where: { id }, data: { isCompleted: true } })
  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}


// ── Email polling ────────────────────────────────────────────────────────────

import { pollEmails, type PollResult } from '@/lib/email-poller'

export async function triggerEmailPoll(): Promise<PollResult> {
  await verifySession()
  return pollEmails()
}

// ── AI parsing ───────────────────────────────────────────────────────────────

export async function parseNaturalLanguageTimeEntry(text: string): Promise<ParseNlResult> {
  await verifySession()

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
  ])

  const referenceDate = todayLocalIso()
  const result = await parseNaturalLanguageToTimeEntry(text, {
    referenceDate,
    clientNames: clients.map((c) => c.name),
    projectNames: projects.map((p) => p.name),
  })

  if (!result.ok) return result

  const validated = timeEntrySchema.safeParse(result.data)
  if (!validated.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'I campi estratti non superano la validazione. Specifica durata e titolo in modo più chiaro.',
    }
  }

  return { ok: true, data: validated.data }
}
