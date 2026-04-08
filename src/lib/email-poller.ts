import { ImapFlow } from 'imapflow'
import { prisma } from '@/lib/prisma'

export type PollResult = {
  created: number
  failed: number
  skipped: number
}

function getConfig() {
  const enabled = process.env.EMAIL_ENABLED === 'true'
  const host = process.env.EMAIL_IMAP_HOST?.trim()
  const port = parseInt(process.env.EMAIL_IMAP_PORT ?? '993', 10)
  const user = process.env.EMAIL_IMAP_USER?.trim()
  const password = process.env.EMAIL_IMAP_PASSWORD?.trim()
  const mailbox = process.env.EMAIL_IMAP_MAILBOX?.trim() || 'INBOX'
  const allowedSenders = (process.env.EMAIL_ALLOWED_SENDERS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  return { enabled, host, port, user, password, mailbox, allowedSenders }
}

function extractAddress(from: string | { address?: string; name?: string } | undefined): string {
  if (!from) return ''
  if (typeof from === 'string') return from.toLowerCase()
  return (from.address ?? '').toLowerCase()
}

export async function pollEmails(): Promise<PollResult> {
  const config = getConfig()

  if (!config.enabled || !config.host || !config.user || !config.password) {
    return { created: 0, failed: 0, skipped: 0 }
  }

  let created = 0
  let failed = 0
  let skipped = 0

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
  })

  try {
    await client.connect()

    const lock = await client.getMailboxLock(config.mailbox)
    try {
      // Fetch all UNSEEN messages
      const messages = client.fetch('1:*', {
        envelope: true,
        bodyStructure: true,
        source: false,
      }, { uid: false })

      const toProcess: Array<{ seq: number; messageId: string; from: string; subject: string }> = []

      for await (const msg of messages) {
        const messageId = msg.envelope?.messageId ?? `seq-${msg.seq}`
        const from = extractAddress(msg.envelope?.from?.[0])
        const subject = msg.envelope?.subject ?? ''

        // Skip if already processed
        const already = await prisma.processedEmail.findUnique({ where: { messageId } })
        if (already) {
          skipped++
          continue
        }

        // Check allowed senders
        if (config.allowedSenders.length > 0 && !config.allowedSenders.some((s) => from.includes(s))) {
          skipped++
          continue
        }

        toProcess.push({ seq: msg.seq, messageId, from, subject })
      }

      // Now fetch full body for each message to process
      for (const { seq, messageId, from, subject } of toProcess) {
        try {
          const fullMsg = await client.fetchOne(`${seq}`, {
            bodyParts: ['TEXT'],
            source: true,
          })

          // Parse source to extract plain text and html parts
          const source = fullMsg && fullMsg.source ? fullMsg.source.toString('utf-8') : ''

          // Extract text from email source: look for plain text content
          // We use a simple extraction from the raw email source
          let emailText = extractTextFromRawEmail(source)

          if (!emailText.trim()) {
            await prisma.processedEmail.create({
              data: { messageId, subject, fromAddress: from, error: 'Corpo email vuoto' },
            })
            failed++
            continue
          }

          // Truncate to 4000 chars
          if (emailText.length > 4000) emailText = emailText.slice(0, 4000)

          // Create task directly from email subject + body
          const task = await prisma.task.create({
            data: {
              title: subject || emailText.slice(0, 100),
              notes: emailText,
            },
          })

          await prisma.processedEmail.create({
            data: { messageId, subject, fromAddress: from, entryId: task.id },
          })

          // Mark as read on IMAP
          await client.messageFlagsAdd(`${seq}`, ['\\Seen'])

          created++
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          await prisma.processedEmail.create({
            data: { messageId, subject, fromAddress: from, error: errorMsg },
          }).catch(() => {})
          failed++
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return { created, failed, skipped }
}

/**
 * Extracts readable plain text from a raw email source (RFC 2822 format).
 * Handles multipart and quoted-printable encoding.
 * Includes forwarded/quoted content to give Gemini full context.
 */
function extractTextFromRawEmail(source: string): string {
  // Decode quoted-printable
  const decodeQP = (s: string) =>
    s
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  // Try to extract text/plain parts from multipart
  const plainParts: string[] = []

  // Find all text/plain sections in multipart
  const textPlainRegex = /Content-Type:\s*text\/plain[^\r\n]*/gi
  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = textPlainRegex.exec(source)) !== null) {
    const start = match.index
    // Find the blank line that separates headers from body
    const headerEnd = source.indexOf('\r\n\r\n', start)
    if (headerEnd === -1) continue

    // Find the next boundary or end
    const bodyStart = headerEnd + 4
    const nextBoundary = source.indexOf('\r\n--', bodyStart)
    const bodyEnd = nextBoundary !== -1 ? nextBoundary : source.length
    const body = source.slice(bodyStart, bodyEnd)

    // Check encoding
    const headerBlock = source.slice(start, headerEnd)
    const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(headerBlock)
    const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(headerBlock)

    let decoded = body
    if (isQP) decoded = decodeQP(body)
    else if (isBase64) {
      try {
        decoded = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf-8')
      } catch {
        decoded = body
      }
    }

    plainParts.push(decoded.trim())
  }

  if (plainParts.length > 0) return plainParts.join('\n\n')

  // Fallback: if no multipart structure, treat content after first blank line as body
  const firstBlank = source.indexOf('\r\n\r\n')
  if (firstBlank !== -1) {
    const body = source.slice(firstBlank + 4)
    // Check if it's QP encoded
    const headers = source.slice(0, firstBlank)
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
      return decodeQP(body).trim()
    }
    return body.trim()
  }

  return source.trim()
}
