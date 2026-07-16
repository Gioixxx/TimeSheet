# /lib-doctor — Diagnostica installazione claude-libs

Verifica che l'installazione di claude-libs nel progetto corrente sia completa e funzionante. Utile sia su un progetto appena bootstrappato sia su uno già avviato.

## Input

Esegui i seguenti check sul progetto corrente (`$PWD` o path specificato dall'utente).
`@.claude/memory/MEMORY.md` se disponibile.

## Check da eseguire

Esegui tutti i check e poi presenta il riepilogo. Non interrompere al primo problema.

### 1. Libs wiring
- `.claude/libs/` esiste (symlink o directory reale)?
- `.claude/libs/CLAUDE.md` è leggibile?
- `CLAUDE.md` del progetto contiene almeno un `@.claude/libs/` reference?

### 2. Memoria progetto
- `.claude/memory/` esiste?
- `MEMORY.md` presente?
- File chiave presenti: `sprint.md`, `decisions.md`, `conventions.md`?
- Segnala file memory mancanti come warning, non errore bloccante.

### 3. Catalogo
- `.claude/libs/catalog.json` esiste e ha più di 10 moduli?
- `generatedAt` nel catalogo — è datato più di 30 giorni? (warning: rigenerare)

### 4. Validator
- `bash .claude/libs/scripts/validate/validate.sh` è eseguibile?
- Python disponibile (`python` o `python3`)? Versione ≥ 3.7?
- `validate_snippets.py`, `validate_catalog_drift.py` presenti in `.claude/libs/scripts/`?

### 5. Ralph
- `ralph/ralph-once.ps1` (o `.sh`) presente nel progetto?
- Se presente: confronta contenuto normalizzato di `ralph/lib/Invoke-RalphRunner.ps1`, `ralph-once.ps1` e `ralph.ps1` con `.claude/libs/ralph/` — se diversi: ⚠️ drift script Ralph → `update-project.ps1 -Path .` o `reconcile.ps1 -Path .`
- `ralph/prd.json` esiste nel progetto?
- Se esiste: ha `userStories` con almeno una storia?

### 6. Mode override
- `.claude/mode-override.md` esiste? Se sì, è leggibile e non vuoto?
- `.claude/active-mode.json` esiste? Mostra il mode attivo.

### 7. Enforcement hooks (opzionale)
- Solo se `workspace.json` ha `features.enforcementHooks: true`.
- `.claude/settings.json` contiene i 4 hook: `guard` (PreToolUse), `session_start` (SessionStart), `save_context` (PreCompact + SessionEnd)?
- `.vibekit/circuit-breaker.conf` presente?
- `.claude/memory/session-log.md` presente? (auto-save sessioni)
- `rtk` sul PATH (`which rtk`)? Se assente: warning — i comandi non verranno proxati (`defer`).
- Se la feature è attiva ma hook/conf mancano: ❌ e suggerisci `reconcile.ps1 -Path <path>`.

### 8. Versione (drift)
- Leggi `.claude/libs/VERSION` (versione libs linkate al clone canonico).
- Se `workspace.json` esiste: confronta `claudeLibsVersion` con `.claude/libs/VERSION`.
  - Se diversi: ⚠️ progetto non allineato — suggerisci `claude-libs -UpdateProject` o `powershell -File .claude/libs/scripts/setup/update-project.ps1 -Path .`
- Se `workspace.json` assente: segnala solo se `.claude/libs/VERSION` non è leggibile (❌); altrimenti ✅ con nota "progetto legacy (senza manifest)".

### 9. Dipendenze runtime per feature

Per ogni feature **abilitata** in `workspace.json` (`features.*: true`), verifica la sua
dipendenza runtime e segnala la **degradazione silenziosa** (la feature risulta attiva ma
non fa nulla). Matrice:

| Feature | Dipendenza runtime | Se manca |
|---|---|---|
| `enforcementHooks` | `rtk` sul PATH · Python ≥3.7 | ⚠️ comandi non proxati (`defer`) → niente risparmio token; hook circuit-breaker comunque attivi |
| `memoryOllama` | Ollama up (`GET http://localhost:11434/api/tags`) · `bash` (install hook) | ⚠️ Ollama giù → sync memoria **salta in silenzio**; ⚠️ bash assente → hook post-commit non installabile via reconcile |
| `libraryRouter` | `claude` CLI (MCP) · Python ≥3.7 · `mcp/library-router/server.py` | ⚠️ MCP non registrato; con Ollama giù → fallback a ricerca keyword (qualità ridotta) |

Dipendenze trasversali (non legate a una feature): `git` (core), Python ≥3.7 (validator/hook/MCP),
Node.js (status line + MCP esterni). Segnala come ⚠️ solo se una funzione che le usa è attiva.

Regola: una feature `true` con dipendenza mancante è **⚠️ warning** (degraded), non ❌ — la feature
"crede" di funzionare. Indica il comando di ripristino (`reconcile.ps1 -Path .`, avvio Ollama, install rtk).

## Regole

- Non modificare nulla — solo diagnosi
- Distingui chiaramente: ❌ bloccante (funzionalità core non funziona), ⚠️ warning (degraded / consigliato), ✅ ok
- Se `.claude/libs/` non esiste, segnala come ❌ e suggerisci: `bash .claude/libs/scripts/setup/init-project.sh <path-progetto>`
- Se catalogo assente o vecchio: `python .claude/libs/scripts/release/generate-catalog.py`
- Se memoria mancante: `bash .claude/libs/scripts/setup/init-project.sh <path> --if-missing`
- Se drift versione: `claude-libs -UpdateProject` (o `update-project.ps1 -Path <path>`)
- Max 30 righe di output — compatto e azionabile

## Output

```
/lib-doctor — <nome progetto o path>

WIRING
  ✅ .claude/libs/ presente
  ❌ CLAUDE.md senza @.claude/libs/ reference

MEMORIA
  ✅ .claude/memory/ presente
  ⚠️  conventions.md mancante

CATALOGO
  ✅ catalog.json presente (124 moduli, 2026-04-30)

VALIDATOR
  ✅ Python 3.12 disponibile
  ⚠️  validate.sh non eseguibile (chmod +x scripts/validate/validate.sh)

RALPH
  ✅ ralph-once.ps1 allineato alle libs
  ⚠️  ralph/lib/Invoke-RalphRunner.ps1 non allineato — esegui: update-project.ps1 -Path .
  ✅ prd.json presente (8 storie)

MODE
  ⚠️  Nessun mode attivo

VERSIONE
  workspace.json: 1.6.0
  .claude/libs/VERSION: 1.7.0
  ⚠️  Progetto non allineato — esegui: claude-libs -UpdateProject

DIPENDENZE (feature attive)
  ✅ enforcementHooks: rtk presente, hook installati
  ⚠️  memoryOllama: Ollama non raggiungibile — il sync memoria salta in silenzio (avvia Ollama)

─────────────────────────────
❌ 1 bloccante  ⚠️ 4 warning  ✅ 3 ok
Priorità: correggi i ❌ prima di lavorare con Claude.
```
