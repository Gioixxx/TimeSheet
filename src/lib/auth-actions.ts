'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { loginSchema, setupSchema } from '@/lib/schemas'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession, deleteSession } from '@/lib/session'

export type AuthActionState = { error?: string } | undefined

export async function createFirstUser(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = setupSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existing = await prisma.user.count()
  if (existing > 0) {
    redirect('/login')
  }

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash: hashPassword(parsed.data.password),
    },
  })

  await createSession(user.id)
  redirect('/')
}

export async function login(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: 'Username o password non corretti' }
  }

  await createSession(user.id)
  redirect('/')
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
