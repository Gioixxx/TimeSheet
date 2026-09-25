'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { overflowChoiceSchema, timeEntrySchema, type TimeEntryInput } from '@/lib/schemas'
import { todayLocalIso } from '@/lib/dates'
import { dateKeyUtc } from '@/lib/holidays'
import {
  excessMinutes,
  isOverflowChecked,
  planSpread,
  splitEntry,
  type EntryPart,
  type OverflowChoice,
  type OverflowInfo,
} from '@/lib/day-overflow'
import type { ActivityType } from '@/lib/activity-types'
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

// ── Ore oltre le 8h ──────────────────────────────────────────────────────────

/**
 * Esito del salvataggio di una voce. Se la voce porta il giorno oltre le 8h ordinarie e
 * l'utente non ha ancora scelto cosa farne, non viene scritto nulla e si restituisce ciò che
 * serve per chiederglielo; il client richiama la stessa action con la scelta.
 */
export type SaveEntryResult = { ok: true } | { ok: false; overflow: OverflowInfo }

type ExistingEntry = { id: string; date: Date; duration: number; activityType: ActivityType }

/** Ore ordinarie (tutto tranne STRAORDINARIO) per giorno, da `fromKey` in poi. */
async function regularMinutesByDay(fromKey: string, excludeId?: string) {
  const rows = await prisma.timeEntry.groupBy({
    by: ['date'],
    where: {
      date: { gte: new Date(fromKey) },
      activityType: { not: 'STRAORDINARIO' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    _sum: { duration: true },
  })
  const byDay = new Map<string, number>()
  for (const row of rows) {
    const key = dateKeyUtc(row.date)
    byDay.set(key, (byDay.get(key) ?? 0) + (row._sum.duration ?? 0))
  }
  return byDay
}

/** Decide le voci da scrivere, oppure che prima serve la scelta dell'utente. */
async function planEntry(
  data: TimeEntryInput,
  choice: unknown,
  existing?: ExistingEntry,
): Promise<{ parts: EntryPart[] } | { ask: OverflowInfo }> {
  const date = dateKeyUtc(new Date(data.date))
  const entry: EntryPart = { date, duration: data.duration, activityType: data.activityType }
  if (!isOverflowChecked(entry.activityType)) return { parts: [entry] }

  const byDay = await regularMinutesByDay(date, existing?.id)
  const regular = byDay.get(date) ?? 0
  const excess = excessMinutes(regular, entry.duration)

  // In modifica si chiede solo se la modifica aumenta l'eccedenza: correggere il titolo di una
  // voce in un giorno già oltre le 8h non deve riaprire la domanda.
  const excessBefore =
    existing && dateKeyUtc(existing.date) === date && isOverflowChecked(existing.activityType)
      ? excessMinutes(regular, existing.duration)
      : 0
  if (excess <= excessBefore) return { parts: [entry] }

  const chosen = overflowChoiceSchema.parse(choice)
  if (!chosen) {
    return {
      ask: {
        date,
        regularMinutes: regular,
        entryMinutes: entry.duration,
        excessMinutes: excess,
        spread: planSpread(excess, date, byDay),
      },
    }
  }
  return { parts: splitEntry(entry, regular, chosen, byDay) }
}

function entryFields(
  data: TimeEntryInput,
  part: EntryPart,
  relations: { clientId?: string; projectId?: string },
) {
  return {
    title: data.title,
    description: data.description,
    activityType: part.activityType,
    duration: part.duration,
    date: new Date(part.date),
    clientId: relations.clientId ?? null,
    projectId: relations.projectId ?? null,
  }
}

function revalidateEntries() {
  revalidatePath('/')
  revalidatePath('/oggi')
  revalidatePath('/calendario', 'layout')
}

// ── TimeEntry actions ────────────────────────────────────────────────────────

export async function createTimeEntry(
  raw: unknown,
  choice?: OverflowChoice,
): Promise<SaveEntryResult> {
  await verifySession()
  const data = timeEntrySchema.parse(raw)
  const plan = await planEntry(data, choice)
  if ('ask' in plan) return { ok: false, overflow: plan.ask }

  const { tagRecords, ...relations } = await resolveRelations(data)
  const connect = tagRecords.map((t) => ({ id: t.id }))
  await prisma.$transaction(
    plan.parts.map((part) =>
      prisma.timeEntry.create({ data: { ...entryFields(data, part, relations), tags: { connect } } })
    )
  )

  revalidateEntries()
  return { ok: true }
}

export async function updateTimeEntry(
  id: string,
  raw: unknown,
  choice?: OverflowChoice,
): Promise<SaveEntryResult> {
  await verifySession()
  const data = timeEntrySchema.parse(raw)
  const existing = await prisma.timeEntry.findUniqueOrThrow({
    where: { id },
    select: { id: true, date: true, duration: true, activityType: true },
  })
  const plan = await planEntry(data, choice, existing)
  if ('ask' in plan) return { ok: false, overflow: plan.ask }

  // La prima parte aggiorna la voce esistente, le altre sono voci nuove
  const [first, ...rest] = plan.parts
  const { tagRecords, ...relations } = await resolveRelations(data)
  const tagIds = tagRecords.map((t) => ({ id: t.id }))
  await prisma.$transaction([
    prisma.timeEntry.update({
      where: { id },
      data: { ...entryFields(data, first, relations), tags: { set: tagIds } },
    }),
    ...rest.map((part) =>
      prisma.timeEntry.create({
        data: { ...entryFields(data, part, relations), tags: { connect: tagIds } },
      })
    ),
  ])

  revalidateEntries()
  return { ok: true }
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

/**
 * Trasforma un'attività in una voce di timesheet.
 *
 * Riceve gli stessi campi del form manuale (`timeEntrySchema`) invece di un sottoinsieme: il
 * task serve solo a precompilare il dialog, quindi tipo, durata, cliente, progetto e tag sono
 * quelli confermati dall'utente al momento della registrazione. Prima erano vincolati a
 * SUPPORTO/MANUTENZIONE e i tag non erano proprio rappresentabili.
 */
export async function logTaskAsEntry(
  taskId: string,
  raw: unknown,
  choice?: OverflowChoice,
): Promise<SaveEntryResult> {
  await verifySession()
  const entryData = timeEntrySchema.parse(raw)
  // Verifica che il task esista prima della transazione, per un errore comprensibile
  await prisma.task.findUniqueOrThrow({ where: { id: taskId } })
  const plan = await planEntry(entryData, choice)
  if ('ask' in plan) return { ok: false, overflow: plan.ask }

  const { tagRecords, ...relations } = await resolveRelations(entryData)
  const connect = tagRecords.map((t) => ({ id: t.id }))
  await prisma.$transaction([
    ...plan.parts.map((part) =>
      prisma.timeEntry.create({
        data: { ...entryFields(entryData, part, relations), tags: { connect } },
      })
    ),
    prisma.task.delete({ where: { id: taskId } }),
  ])
  revalidateEntries()
  return { ok: true }
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
