import { prisma } from '@/lib/prisma'
import { nextOccurrence } from '@/lib/reminder-recurrence'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const reminder = await prisma.reminder.findUniqueOrThrow({ where: { id } })

    const occ = nextOccurrence(reminder)
    if (!occ) {
      // Nessuna occorrenza futura: non dovrebbe succedere, ma gestiamo gracefully
      return Response.json({ ok: true })
    }

    // Per reminder ricorrenti: imposta notifiedAt = occorrenza corrente
    // così la prossima chiamata a nextOccurrence calcolerà l'occorrenza successiva.
    // Per reminder non ricorrenti: basta impostare notifiedAt a qualsiasi valore non null.
    await prisma.reminder.update({
      where: { id },
      data: { notifiedAt: occ },
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 404 })
  }
}
