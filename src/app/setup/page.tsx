import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isAuthEnabled } from '@/lib/session'
import AuthCard from '@/components/AuthCard'
import SetupForm from './SetupForm'

export default async function SetupPage() {
  // Vedi commento in src/app/login/page.tsx: serve per evitare il prerendering statico.
  await connection()

  if (!isAuthEnabled()) {
    redirect('/')
  }

  const existing = await prisma.user.count()
  if (existing > 0) {
    redirect('/login')
  }

  return (
    <AuthCard title="Benvenuto in Timesheet" subtitle="Crea il tuo account per iniziare">
      <SetupForm />
    </AuthCard>
  )
}
