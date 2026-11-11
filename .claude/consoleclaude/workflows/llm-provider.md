# Workflow: Provider LLM locale — Regole

> **Revisione doc:** 2026-10

## Principio

I task meccanici girano su un LLM **locale**, non su Claude (leva 3 di `.claude/consoleclaude/workflows/token-economics.md`). Il
provider è **Ollama** (default) oppure **LM Studio** via trasporto OpenAI-compatible `/v1`, che
serve anche llama.cpp, vLLM e LiteLLM. La selezione è **esplicita**: nessun auto-detect, perché
con due server attivi non sarebbe deterministico quale ha risposto.

## Regole

- **Precedenza, identica nel client Python e negli script PowerShell**: parametro esplicito > env var > `models.json`
  (`CONSOLECLAUDE_MODELS`, poi `.claude/models.json` del progetto, poi la cartella dei dati di ConsoleClaude) > default hardcoded.
  `provider := LLM_PROVIDER > models.json .llm.provider > ollama`. Un valore ignoto **non** è
  fatale: warning e fallback a `ollama` (fail-open).
- **`OLLAMA_TIMEOUT` vale per entrambi i provider** — non esiste `LMSTUDIO_TIMEOUT`.
- **Su `/v1`, `num_ctx` e `keep_alive` non esistono per-request**: sono load-time
  (`lms load --context-length 16384 --ttl 3600`). Un contesto troppo basso **tronca i prompt in
  silenzio**, e il gate della memoria scarta ogni risultato: sintomo confuso, non un crash.
  Usa `.claude/consoleclaude/tools/llm/setup-lmstudio.ps1`, che fa quel load.
- **Su `/v1` i token di reasoning contano dentro `max_tokens`.** Con un modello "thinking" e i
  cap tarati su Ollama, la risposta torna **vuota** con `finish_reason: "length"`. Usa un
  modello non-reasoning (`qwen/qwen3-coder-30b`) o alza i cap. Il client lo diagnostica con un
  warning esplicito su stderr.
- **Gli id dei modelli non coincidono**: `qwen3-coder:30b` (Ollama) vs `qwen/qwen3-coder-30b`
  (LM Studio). Un 404 in fase di generazione è quasi sempre questo.
- **Non rinominare** le variabili `OLLAMA_*` né il nome del server `ollama-sidecar`: valgono per
  il provider **attivo**, qualunque sia. I nomi nuovi (`LLM_PROVIDER`, `LMSTUDIO_URL`,
  `LMSTUDIO_MODEL`) si affiancano.
- **Un solo client per linguaggio**: il client Python dell'app (lo usa il sidecar) e gli script
  PowerShell di `.claude/consoleclaude/tools/llm/`. Non reimplementare la risoluzione altrove.

## Pattern

| Cosa | Ollama | LM Studio (`/v1`) |
| --- | --- | --- |
| Avvio | `ollama serve` | `lms server start` |
| Setup | — | `.claude/consoleclaude/tools/llm/setup-lmstudio.ps1 -Apply` |
| Health | `GET /api/tags` | `GET /v1/models` |
| Generate | `POST /api/generate` | `POST /v1/chat/completions` |
| Contesto | `num_ctx` per-request | `lms load --context-length` |
| Residenza | `keep_alive` per-request | `lms load --ttl` |

- **Attivare per una sessione**: `$env:LLM_PROVIDER = 'lmstudio'` · **per un progetto**:
  `.claude/models.json` → `"llm": { "provider": "lmstudio" }`.
- **Avvio del provider attivo**: `.claude/consoleclaude/tools/llm/ensure-llm.ps1` (delega a
  `ensure-ollama.ps1` o al setup di LM Studio) — è ciò che chiama `/session-start`; la console
  lo lancia da sola, una volta, all'apertura della prima sessione con il sidecar. Se il provider
  non è installato o non parte, esce con un codice diverso da 0 e la sessione prosegue senza sidecar.
- **Diagnosi**: il client Python ha `--doctor` (configurazione → server e modello → generazione con
  JSON; si ferma al primo errore e dice il passo successivo; `--tier`, `--json`) e, per gli script,
  `--print-config` e `--health`. Il percorso del client lo dà la console nella variabile
  `CONSOLECLAUDE_LLM_CLIENT`; `ensure-llm.ps1` stampa il comando giusto quando il provider non parte.

## Reference → `.claude/consoleclaude/workflows/llm-provider-reference.md`
