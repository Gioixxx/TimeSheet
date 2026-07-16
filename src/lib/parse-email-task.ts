import { z } from 'zod'
import { callIapi, extractJsonObject, truncateList } from '@/lib/iapi-client'

const emailTaskSchema = z.object({
  clientName: z.union([z.string(), z.null()]).optional(),
  projectName: z.union([z.string(), z.null()]).optional(),
  estimatedMinutes: z.union([z.number().int().min(1).max(1440), z.null()]).optional(),
})

export type ParseEmailTaskErrorCode = 'CONFIG' | 'API' | 'PARSE' | 'VALIDATION'

export type ParseEmailTaskResult =
  | { ok: true; data: { clientName?: string; projectName?: string; estimatedMinutes?: number } }
  | { ok: false; code: ParseEmailTaskErrorCode; message: string }

const SYSTEM_PROMPT = `Sei un assistente che legge un'email arrivata in una casella di supporto/lavoro e ne estrae informazioni per creare un task su una bacheca.

Devi estrarre un singolo oggetto JSON con queste chiavi esatte:
- "clientName": nome del cliente se citato nell'oggetto o nel corpo, altrimenti null (usa il nome esatto dalla lista fornita se corrisponde)
- "projectName": nome del progetto se citato, altrimenti null
- "estimatedMinutes": numero intero da 1 a 1440 (stima del tempo di lavoro in minuti) SOLO se un tempo o uno sforzo è esplicitamente menzionato o chiaramente implicito nel testo, altrimenti null — non inventare una stima se il testo non la suggerisce

Rispondi SOLO con JSON valido, senza testo prima o dopo.`

function buildPrompt(
  subject: string,
  body: string,
  context: { clientNames: string[]; projectNames: string[] }
): string {
  const clientList = truncateList(context.clientNames, '(nessun cliente in archivio)')
  const projectList = truncateList(context.projectNames, '(nessun progetto in archivio)')

  const userBlock = `Clienti già presenti (usa lo stesso nome se l’email si riferisce a uno di questi):
${clientList}

Progetti già presenti (usa lo stesso nome se pertinente):
${projectList}

Oggetto email:
${subject}

Corpo email:
${body}

Ricorda: rispondi SOLO con l’oggetto JSON richiesto, nient’altro. Nessun testo introduttivo, nessuna spiegazione, nessun blocco di codice.`

  return `${SYSTEM_PROMPT}\n\n${userBlock}`
}

export async function parseEmailToTask(
  subject: string,
  body: string,
  context: { clientNames: string[]; projectNames: string[] }
): Promise<ParseEmailTaskResult> {
  const prompt = buildPrompt(subject, body, context)
  const result = await callIapi(prompt, { temperature: 0.2, maxTokens: 200 })
  if (!result.ok) return result

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(extractJsonObject(result.text))
  } catch {
    return { ok: false, code: 'PARSE', message: 'Risposta del modello non valida (JSON).' }
  }

  const parsed = emailTaskSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION', message: 'I dati estratti non sono validi.' }
  }

  return {
    ok: true,
    data: {
      clientName: parsed.data.clientName?.trim() || undefined,
      projectName: parsed.data.projectName?.trim() || undefined,
      estimatedMinutes: parsed.data.estimatedMinutes ?? undefined,
    },
  }
}
