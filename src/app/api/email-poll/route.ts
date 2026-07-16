import { pollEmails } from '@/lib/email-poller'
import { requireApiAuth } from '@/lib/dal'

export async function POST() {
  const unauthorized = await requireApiAuth()
  if (unauthorized) return unauthorized

  const result = await pollEmails()
  return Response.json(result)
}
