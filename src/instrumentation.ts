export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return

  // Sotto Electron il polling email è già gestito dal loop nativo in electron/main.cjs
  // (fetch periodico verso /api/email-poll) — evitiamo di farlo due volte.
  // `TIMESHEET_EMAIL_POLL_EXTERNAL` è il flag esplicito, impostato da Electron sia in dev sia
  // nel pacchetto; `ELECTRON_RUN_AS_NODE` resta accettato per i build già distribuiti.
  if (process.env.TIMESHEET_EMAIL_POLL_EXTERNAL || process.env.ELECTRON_RUN_AS_NODE) return

  const { pollEmails } = await import('@/lib/email-poller')

  const poll = () => pollEmails().catch(() => {})
  poll()
  setInterval(poll, 5 * 60 * 1000)
}
