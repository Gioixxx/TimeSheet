import { z } from 'zod'
import type { TimeEntryInput } from '@/lib/schemas'
import { callIapi, extractJsonObject, truncateList } from '@/lib/iapi-client'

const aiResponseSchema = z.object({
  title: z.string().min(1),
  description: z.union([z.string(), z.null()]).optional(),
  durationMinutes: z.number().int().min(1).max(1440),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityType: z.enum(['SUPPORTO', 'MANUTENZIONE', 'PERMESSO', 'FERIE']),
  clientName: z.union([z.string(), z.null()]).optional(),
  projectName: z.union([z.string(), z.null()]).optional(),
  tags: z.union([z.string(), z.null()]).optional(),
})

export type ParseNlErrorCode = 'CONFIG' | 'INPUT' | 'API' | 'PARSE' | 'VALIDATION'

export type ParseNlResult =
  | { ok: true; data: TimeEntryInput }
  | { ok: false; code: ParseNlErrorCode; message: string }

function toTimeEntryInput(parsed: z.infer<typeof aiResponseSchema>): TimeEntryInput {
  return {
    title: parsed.title.trim(),
    description: parsed.description?.trim() || undefined,
    duration: parsed.durationMinutes,
    date: parsed.date,
    activityType: parsed.activityType,
    clientName: parsed.clientName?.trim() || undefined,
    projectName: parsed.projectName?.trim() || undefined,
    tags: parsed.tags?.trim() || undefined,
  }
}

const SYSTEM_PROMPT = `Sei un assistente per un timesheet aziendale. L'utente descrive in linguaggio naturale (italiano o inglese) cosa ha fatto e per quanto tempo.

Devi estrarre un singolo oggetto JSON con queste chiavi esatte:
- "title": stringa breve (titolo della voce di lavoro, max ~80 caratteri)
- "description": stringa opzionale con dettagli aggiuntivi dall'utente, o null se non serve
- "durationMinutes": numero intero da 1 a 1440 (durata in minuti)
- "date": stringa "YYYY-MM-DD" (data dell'attività; se dice "oggi" o non specifica, usa la data di riferimento fornita)
- "activityType": uno tra "SUPPORTO", "MANUTENZIONE", "PERMESSO", "FERIE" (ticket/helpdesk/assistenza/cliente → SUPPORTO; manutenzione/evolutiva/sviluppo/bugfix strutturale → MANUTENZIONE; permesso/ore di permesso/congedo orario → PERMESSO; ferie/giorno libero/vacanza → FERIE; se ambiguo, preferisci SUPPORTO)
- "clientName": nome cliente se citato, altrimenti null (usa il nome esatto dalla lista fornita se corrisponde)
- "projectName": nome progetto se citato, altrimenti null
- "tags": stringa con tag separati da virgola, oppure null (es. "ticket, urgente")

Conversioni tempo comuni: 1 ora = 60 minuti, "due ore" = 120, "un'ora e mezza" = 90, "mezz'ora" = 30, "45 minuti" = 45.
Per FERIE: 1 giorno = 480 minuti, "mezza giornata" = 240, "2 giorni" = 960. Per PERMESSO usa ore/minuti normali.

Rispondi SOLO con JSON valido, senza testo prima o dopo.`

function buildPrompt(
  trimmed: string,
  context: { referenceDate: string; clientNames: string[]; projectNames: string[] }
): string {
  const clientList = truncateList(context.clientNames, '(nessun cliente in archivio)')
  const projectList = truncateList(context.projectNames, '(nessun progetto in archivio)')

  const userBlock = `Data di riferimento per "oggi" (YYYY-MM-DD): ${context.referenceDate}

Clienti già presenti (usa lo stesso nome se l’utente si riferisce a uno di questi):
${clientList}

Progetti già presenti (usa lo stesso nome se pertinente):
${projectList}

Testo dell’utente:
${trimmed}

Ricorda: rispondi SOLO con l’oggetto JSON richiesto, nient’altro. Nessun testo introduttivo, nessuna spiegazione, nessun blocco di codice.`

  return `${SYSTEM_PROMPT}\n\n${userBlock}`
}

export async function parseNaturalLanguageToTimeEntry(
  text: string,
  context: { referenceDate: string; clientNames: string[]; projectNames: string[] }
): Promise<ParseNlResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, code: 'INPUT', message: 'Inserisci una descrizione dell’attività.' }
  }
  if (trimmed.length > 4000) {
    return { ok: false, code: 'INPUT', message: 'Testo troppo lungo (massimo 4000 caratteri).' }
  }

  const prompt = buildPrompt(trimmed, context)
  const result = await callIapi(prompt, { temperature: 0.2, maxTokens: 500 })
  if (!result.ok) return result

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(extractJsonObject(result.text))
  } catch {
    return { ok: false, code: 'PARSE', message: 'Risposta del modello non valida (JSON).' }
  }

  const parsed = aiResponseSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'I dati estratti non sono validi. Riprova con una frase più chiara.',
    }
  }

  return { ok: true, data: toTimeEntryInput(parsed.data) }
}
