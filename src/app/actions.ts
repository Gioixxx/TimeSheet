'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { timeEntrySchema } from '@/lib/schemas'
import {
  parseNaturalLanguageToTimeEntry,
  type ParseNlResult,
} from '@/lib/parse-nl-time-entry'

export async function createTimeEntry(raw: unknown) {
  const data = timeEntrySchema.parse(raw)

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
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  )

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
}

export async function deleteTimeEntry(id: string) {
  await prisma.timeEntry.delete({ where: { id } })
  revalidatePath('/')
}

export async function parseNaturalLanguageTimeEntry(text: string): Promise<ParseNlResult> {
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
  ])

  const referenceDate = new Date().toISOString().slice(0, 10)
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
