export type IapiCallResult = { ok: true; text: string } | { ok: false; code: 'CONFIG' | 'API'; message: string }

// Il timeout lato gateway iAPi (chiamata a Ollama) è 120s; restiamo sotto per lasciare che
// sia il suo 504 (messaggio più preciso) a scattare per primo nella maggior parte dei casi.
const REQUEST_TIMEOUT_MS = 90_000

type IApiGenerateResponse = {
  response: string
  model?: string
  eval_count?: number
  total_duration_ms?: number
}

export function extractJsonObject(content: string): string {
  const t = content.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  if (fence) return fence[1].trim()
  return t
}

export function truncateList(names: string[], emptyLabel: string, maxChars = 800): string {
  if (names.length === 0) return emptyLabel
  let out = ''
  for (const name of names) {
    const next = out ? `${out}, ${name}` : name
    if (next.length > maxChars) break
    out = next
  }
  return out || names[0].slice(0, maxChars)
}

function mapHttpError(status: number, detail: string | undefined): IapiCallResult {
  if (status === 422) {
    return {
      ok: false,
      code: 'API',
      message: 'Testo troppo lungo per l’elaborazione AI locale. Prova con una descrizione più breve.',
    }
  }
  if (status === 503) {
    const d = (detail ?? '').toLowerCase()
    if (d.includes('pulling')) {
      return {
        ok: false,
        code: 'API',
        message: 'Il modello AI locale si sta ancora scaricando. Riprova tra qualche minuto.',
      }
    }
    if (d.includes('missing')) {
      return {
        ok: false,
        code: 'API',
        message: 'Il modello AI locale non è ancora disponibile sul server. Riprova più tardi.',
      }
    }
    return { ok: false, code: 'API', message: 'Il servizio AI locale non è pronto al momento. Riprova tra poco.' }
  }
  if (status === 504) {
    return {
      ok: false,
      code: 'API',
      message: 'Il servizio AI locale ha impiegato troppo tempo a rispondere. Riprova più tardi.',
    }
  }
  if (status === 502) {
    return { ok: false, code: 'API', message: 'Il servizio AI locale non è raggiungibile in questo momento.' }
  }
  return { ok: false, code: 'API', message: 'Errore imprevisto del servizio AI locale. Riprova più tardi.' }
}

export async function callIapi(
  prompt: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<IapiCallResult> {
  const baseUrl = process.env.IAPI_BASE_URL?.trim().replace(/\/+$/, '')
  if (!baseUrl) {
    return {
      ok: false,
      code: 'CONFIG',
      message:
        'Servizio AI locale non configurato. Imposta IAPI_BASE_URL nel file .env.local per usare l’interpretazione AI.',
    }
  }

  const apiKey = process.env.IAPI_API_KEY?.trim()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        prompt,
        temperature: opts?.temperature ?? 0.2,
        max_tokens: opts?.maxTokens ?? 500,
      }),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeoutId)
    console.error('iAPi /generate request failed:', e)
    if (e instanceof Error && e.name === 'AbortError') {
      return {
        ok: false,
        code: 'API',
        message: 'Il servizio AI locale non ha risposto entro il tempo previsto. Riprova più tardi.',
      }
    }
    return {
      ok: false,
      code: 'API',
      message: 'Il servizio AI locale non è raggiungibile. Verifica che sia acceso e connesso alla rete.',
    }
  }
  clearTimeout(timeoutId)

  if (!res.ok) {
    let detail: string | undefined
    try {
      const body = (await res.json()) as { detail?: string }
      detail = body?.detail
    } catch {
      // body non-JSON — si ricade su un messaggio generico basato solo sullo status
    }
    console.error(`iAPi /generate returned ${res.status}: ${detail ?? '(no detail)'}`)
    return mapHttpError(res.status, detail)
  }

  let payload: IApiGenerateResponse
  try {
    payload = (await res.json()) as IApiGenerateResponse
  } catch (e) {
    console.error('iAPi /generate returned a non-JSON body:', e)
    return { ok: false, code: 'API', message: 'Risposta del servizio AI locale non valida.' }
  }

  const raw = payload?.response
  if (!raw) {
    return { ok: false, code: 'API', message: 'Il modello non ha restituito contenuto.' }
  }

  return { ok: true, text: raw }
}
