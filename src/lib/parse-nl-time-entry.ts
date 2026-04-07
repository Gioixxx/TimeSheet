import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import type { TimeEntryInput } from '@/lib/schemas'

const aiResponseSchema = z.object({
  title: z.string().min(1),
  description: z.union([z.string(), z.null()]).optional(),
  durationMinutes: z.number().int().min(1).max(1440),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityType: z.enum(['SUPPORTO', 'MANUTENZIONE']),
  clientName: z.union([z.string(), z.null()]).optional(),
  projectName: z.union([z.string(), z.null()]).optional(),
  tags: z.union([z.string(), z.null()]).optional(),
})

export type ParseNlErrorCode = 'CONFIG' | 'INPUT' | 'API' | 'PARSE' | 'VALIDATION'

export type ParseNlResult =
  | { ok: true; data: TimeEntryInput }
  | { ok: false; code: ParseNlErrorCode; message: string }

function extractJsonObject(content: string): string {
  const t = content.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  if (fence) return fence[1].trim()
  return t
}

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
- "activityType": "SUPPORTO" oppure "MANUTENZIONE" (ticket/helpdesk/assistenza/cliente → SUPPORTO; manutenzione/evolutiva/sviluppo feature/bugfix strutturale → MANUTENZIONE; se ambiguo, preferisci SUPPORTO)
- "clientName": nome cliente se citato, altrimenti null (usa il nome esatto dalla lista fornita se corrisponde)
- "projectName": nome progetto se citato, altrimenti null
- "tags": stringa con tag separati da virgola, oppure null (es. "ticket, urgente")

Conversioni tempo comuni: 1 ora = 60 minuti, "due ore" = 120, "un'ora e mezza" = 90, "mezz'ora" = 30, "45 minuti" = 45.

Rispondi SOLO con JSON valido, senza testo prima o dopo.`

export async function parseNaturalLanguageToTimeEntry(
  text: string,
  context: { referenceDate: string; clientNames: string[]; projectNames: string[] }
): Promise<ParseNlResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey?.trim()) {
    return {
      ok: false,
      code: 'CONFIG',
      message:
        'Chiave API mancante. Imposta GEMINI_API_KEY nel file .env.local per usare l’interpretazione AI.',
    }
  }

  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, code: 'INPUT', message: 'Inserisci una descrizione dell’attività.' }
  }
  if (trimmed.length > 4000) {
    return { ok: false, code: 'INPUT', message: 'Testo troppo lungo (massimo 4000 caratteri).' }
  }

  // gemini-2.0-flash non è più disponibile per chiavi nuove; vedi https://ai.google.dev/gemini-api/docs/models
  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

  const clientList =
    context.clientNames.length > 0 ? context.clientNames.join(', ') : '(nessun cliente in archivio)'
  const projectList =
    context.projectNames.length > 0 ? context.projectNames.join(', ') : '(nessun progetto in archivio)'

  const userBlock = `Data di riferimento per "oggi" (YYYY-MM-DD): ${context.referenceDate}

Clienti già presenti (usa lo stesso nome se l’utente si riferisce a uno di questi):
${clientList}

Progetti già presenti (usa lo stesso nome se pertinente):
${projectList}

Testo dell’utente:
${trimmed}`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    })

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: risposta AI oltre 30 secondi.')), 30_000)
    )
    const result = await Promise.race([model.generateContent(userBlock), timeout])
    const raw = result.response.text()
    if (!raw) {
      return { ok: false, code: 'API', message: 'Il modello non ha restituito contenuto.' }
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(extractJsonObject(raw))
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

    const data = toTimeEntryInput(parsed.data)
    return { ok: true, data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore sconosciuto'
    return { ok: false, code: 'API', message: `Errore API: ${msg}` }
  }
}
