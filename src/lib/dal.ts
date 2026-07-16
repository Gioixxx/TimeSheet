import { cache } from 'react'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import { getSession, isAuthEnabled } from './session'

export const verifySession = cache(async (): Promise<{ userId: string | null }> => {
  if (!isAuthEnabled()) return { userId: null }

  const session = await getSession()
  if (!session?.uid) {
    redirect('/login')
  }
  return { userId: session.uid }
})

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession()
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
})

export async function requireApiAuth(): Promise<NextResponse | null> {
  if (!isAuthEnabled()) return null
  const session = await getSession()
  if (!session?.uid) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  return null
}
