# Provider LLM locale — Reference

> **Revisione doc:** 2026-10 · Regole essenziali in `.claude/consoleclaude/workflows/llm-provider.md`

> Contiene la tabella di traduzione del trasporto, la configurazione (`models.json` e variabili), il setup di LM Studio, la mappa dei client e il troubleshooting. Caricalo on-demand, non serve nel preambolo.

## 1. Tabella di traduzione del trasporto

| Ollama (nativo) | OpenAI `/v1` | Note |
| --- | --- | --- |
| `POST /api/generate` `{prompt}` | `POST /v1/chat/completions` `{messages:[{role:"user",content}]}` | Nessun client usa un system prompt: conversione 1:1 |
| `POST /api/chat` `{messages}` | identico | I ruoli coincidono, l'array passa invariato |
| `.response` | `.choices[0].message.content` | Punto di estrazione unico |
| `options.num_predict` | `max_tokens` (top-level) | |
| `options.temperature` | `temperature` (top-level) | |
| `options.num_ctx` | **nessun equivalente** | Load-time: `lms load --context-length` |
| `keep_alive` | **nessun equivalente** | Load-time: `lms load --ttl` |
| `format: <schema>` | `response_format: {type:"json_schema", json_schema:{name, strict:false, schema}}` | `strict:false` è deliberato — vedi §4 |
| `GET /api/tags` → `.models[].name` | `GET /v1/models` → `.data[].id` | |
| `GET /api/ps` (caricati + VRAM) | **nessun equivalente** | Solo Ollama |
| preload senza prompt | completion con `max_tokens: 1` | Innesca il JIT-load anche su llama.cpp |
| stream NDJSON | SSE `data: {…}` … `data: [DONE]` | Delta in `choices[0].delta.content` |
| errore `{"error":"str"}` | `{"error":{"message":…}}` | I parser accettano entrambe |

Le option senza equivalente vengono **scartate**, non tradotte a caso: ometterle è corretto,
inventare un parametro no.

## 2. Configurazione

```json
{
  "llm":      { "provider": "lmstudio" },
  "ollama":   { "model": "qwen3-coder:30b", "url": "http://localhost:11434", "keepAlive": "30m" },
  "lmstudio": { "model": "qwen/qwen3-coder-30b", "url": "http://localhost:1234",
                "contextLength": 16384, "ttlSeconds": 3600 }
}
```

`models.json` si cerca in quest'ordine: il file indicato da `CONSOLECLAUDE_MODELS`, poi `.claude/models.json` del
progetto, poi la cartella dei dati di ConsoleClaude (vale per tutti i progetti). Il primo livello che ha il valore vince.

Un `url` che viene da un file del repository (il `.claude/models.json` del progetto) vale solo se l'host è locale (`localhost`, `127.0.0.1`, `::1`, con `http` o `https`, senza credenziali): un repository non sceglie verso quale host l'app apre connessioni. Un host remoto lo scegli tu, fuori dal repository: con la variabile d'ambiente (`OLLAMA_URL`, `LMSTUDIO_URL`), con `CONSOLECLAUDE_MODELS` o nel `models.json` della cartella dei dati di ConsoleClaude. Con un `url` remoto nel file del progetto i componenti si comportano in due modi, entrambi senza nessuna chiamata verso quell'host:

- **Saltano al livello dopo**: il sidecar, il router, la bozza del commit, il digest e gli script PowerShell di avvio del provider (`ensure-llm.ps1`, `ensure-ollama.ps1`, `setup-lmstudio.ps1`, anche lanciati da `/session-start`) ignorano quel `url` e usano il `models.json` dei dati dell'app o il default locale, con una riga di avviso.
- **Rifiutano**: la sincronizzazione della memoria e il riassunto di `save_context` non partono, senza ricadere sul livello dopo e senza una riga su stderr (la sincronizzazione scrive `remote_url_not_allowed` nel suo log).

| Variabile | Default | Vale per |
| --- | --- | --- |
| `LLM_PROVIDER` | `ollama` | selezione del provider |
| `OLLAMA_URL` / `OLLAMA_MODEL` | `http://localhost:11434` / `qwen3-coder:30b` | ollama |
| `LMSTUDIO_URL` / `LMSTUDIO_MODEL` | `http://localhost:1234` / `qwen/qwen3-coder-30b` | lmstudio |
| `OLLAMA_TIMEOUT` | `120` | **entrambi** |
| `OLLAMA_KEEP_ALIVE` | — | solo ollama (su `/v1` è load-time) |

`.claude/memory-sync.json` resta prioritario su `models.json` per la memoria, con le chiavi
`ollamaUrl`, `model` e `provider`: lasciale vuote (`""`) per lasciar decidere `models.json`,
oppure impostale sui valori che vuoi per quella funzione (un `ollamaUrl` con host remoto però viene rifiutato: vedi «Host remoto» in `.claude/consoleclaude/workflows/memory-ollama-reference.md`).

## 3. Setup di LM Studio

```powershell
# 1. Installa LM Studio (https://lmstudio.ai) e aprilo una volta: registra la CLI `lms`.
# 2. Scarica un modello. NON serve che sia lo stesso di Ollama, e l'id è diverso.
lms get qwen/qwen3-coder-30b          # alternative: qwen/qwen3-coder-14b (16GB), qwen2.5-coder-7b (8GB)

# 3. Avvia, carica con context e TTL, e scrivi la config del progetto.
powershell -NoProfile -File .claude/consoleclaude/tools/llm/setup-lmstudio.ps1 -Apply

# 4. Verifica: configurazione, server, modello e una generazione con schema JSON.
python $env:CONSOLECLAUDE_LLM_CLIENT --doctor
```

`setup-lmstudio.ps1` scrive **solo** `<progetto>/.claude/models.json`, mai il `models.json` dei dati dell'app.
Senza `-Apply` stampa lo snippet da copiare. `ensure-llm.ps1` è ciò che chiama `/session-start`: risolve il
provider e delega, con `-SkipLoad` perché un `lms load` a ogni avvio di sessione sarebbe lento.

## 4. Structured output e `strict: false`

Gli schemi dei tool del sidecar passano **verbatim** dentro `response_format.json_schema.schema`.
`strict` resta `false` perché lo strict mode OpenAI pretende `additionalProperties: false` e un
`required` completo, che quegli schemi non rispettano tutti. Il vincolo viene comunque applicato
via grammatica, e la rete find/rfind del sidecar copre i modelli che incorniciano il JSON con
del testo.

## 5. Mappa dei client

| Client | Dove | Note |
| --- | --- | --- |
| Python (condiviso) | `llm_client.py` nell'app | `generate()` / `generate_raising()` + CLI; lo usano il sidecar e il router |
| PowerShell (condiviso) | `.claude/consoleclaude/tools/llm/_llm.ps1` | usato da `ensure-llm.ps1`, `ensure-ollama.ps1` e `setup-lmstudio.ps1` |
| hook | `save_context.py` | copia inline **deliberata**: budget ~60s, solo stdlib |

`generate()` inghiotte ogni errore e torna `None`; `generate_raising()` propaga le
`requests.exceptions.*` invariate ed è il contratto su cui poggia il fallback keyword del
library-router. Non scambiarle.

## 6. Troubleshooting

Prima di tutto `--doctor` del client Python: percorre gli stessi passi di una chiamata vera
(`--tier offline` solo la configurazione e da dove arriva, `catalog` anche server e modello, `full` di default anche una
generazione con schema JSON) e si ferma al primo errore con il passo successivo. Riconosce da solo l'id nel formato
dell'altro provider, il modello assente (con gli id simili), il reasoning che consuma il cap, lo schema ignorato e il
timeout. `ensure-llm.ps1` lo suggerisce quando il provider non parte.

| Sintomo | Causa | Rimedio |
| --- | --- | --- |
| Risposta **vuota**, `parse_error` con `raw` vuoto | Modello *thinking*: i token di reasoning consumano `max_tokens` prima che il modello scriva `content` | Modello non-reasoning, o cap più alti. Il client stampa un warning esplicito |
| Il modello "riassume male" e la memoria non si aggiorna mai | `--context-length` troppo basso: il prompt viene troncato in silenzio e il gate scarta il risultato | `lms load <id> --context-length 16384` |
| HTTP 404 in generazione | L'id LM Studio non coincide con quello Ollama | `lms ls` e allinea `lmstudio.model` |
| Il modello si scarica tra un turno e l'altro | Su `/v1` `keep_alive` non esiste per-request | `lms load --ttl 3600` |
| `lms server start` → "Timed out waiting for LM Studio daemon to start"; con `LMS_API_SERVER_INFO_PATH` → "Invalid passkey" | Da Bionic 1.1.8 (LM Studio rinominato) l'app scrive `http-server.json` e `lms-key-2` in `<home>/apps/<app>/.internal/`, mentre `lms` li cerca in `<home>/.internal/` | `setup-lmstudio.ps1` (e quindi `ensure-llm.ps1`) fa da ponte con `_lmstudio.ps1`: avvia l'app se è spenta, copia la chiave e imposta `LMS_API_SERVER_INFO_PATH`. A mano, in un'altra shell: `. .claude/consoleclaude/tools/llm/_lmstudio.ps1; Connect-LmStudioCli -LmStudioHome (Get-LmStudioHome)` |

**Tornare a Ollama**: togli `LLM_PROVIDER` e rimetti `"provider": "ollama"` in `models.json`.
