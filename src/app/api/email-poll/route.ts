import { pollEmails } from '@/lib/email-poller'

export async function POST() {
  const result = await pollEmails()
  return Response.json(result)
}
