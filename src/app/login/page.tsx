import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isAuthEnabled } from '@/lib/session'
import AuthCard from '@/components/AuthCard'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  // Forza la valutazione a request-time: senza connection() questa pagina non legge
  // alcuna Request-time API e verrebbe prerenderizzata staticamente al build (con
  // AUTH_ENABLED/DB dello stato di build, non quelli runtime del container).
  await connection()

  if (!isAuthEnabled()) {
    redirect('/')
  }

  const existing = await prisma.user.count()
  if (existing === 0) {
    redirect('/setup')
  }

  return (
    <AuthCard title="Timesheet" subtitle="Accedi per continuare">
      <LoginForm />
    </AuthCard>
  )
}
