export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return
  // In Electron il polling è già gestito dal loop nativo in electron/main.cjs
  // (fetch periodico verso /api/email-poll) — evitiamo di farlo due volte.
  if (process.env.ELECTRON_RUN_AS_NODE) return

  const { pollEmails } = await import('@/lib/email-poller')

  const poll = () => pollEmails().catch(() => {})
  poll()
  setInterval(poll, 5 * 60 * 1000)
}
