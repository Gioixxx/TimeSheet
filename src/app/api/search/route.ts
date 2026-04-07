import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
        { project: { name: { contains: q, mode: 'insensitive' } } },
        { tags: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    include: { client: true, project: true, tags: true },
    orderBy: { date: 'desc' },
    take: 10,
  })

  return NextResponse.json(entries)
}
