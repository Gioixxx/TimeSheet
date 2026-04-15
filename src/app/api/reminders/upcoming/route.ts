import { prisma } from '@/lib/prisma'
import { nextOccurrence } from '@/lib/reminder-recurrence'

export async function GET() {
  const now = new Date()

  // Prendi tutti i reminder attivi (non completati)
  const reminders = await prisma.reminder.findMany({
    where: { isCompleted: false },
  })

  // Filtra quelli la cui prossima occorrenza è già scaduta
  const due = reminders
    .map((r) => ({ r, occ: nextOccurrence(r) }))
    .filter(({ occ }) => occ !== null && occ <= now)
    .map(({ r, occ }) => ({ ...r, occurrenceAt: occ!.toISOString() }))

  return Response.json(due)
}
