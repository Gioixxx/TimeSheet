# Ralph — Sviluppo Autonomo Iterativo

Sistema di sviluppo autonomo che esegue Claude in loop, implementando una user story per volta fino al completamento del PRD.

> **USARE CON CAUTELA** — Ralph esegue modifiche al codice in autonomia con `--dangerously-skip-permissions`.
> Assicurarsi di avere un commit pulito prima di avviare.

**Pre-flight consigliato**

- Working tree Git **pulito** (o commit/WIP consapevole): facilita rollback e review del loop.
- Validare `prd.json` contro `prd.schema.json` nel repo **claude-libs** prima di lunghe sessioni:  
  `pip install -r /path/to/claude-libs/scripts/requirements-ci.txt` →  
  `python /path/to/claude-libs/scripts/validate/validate_prd_schema.py` (usa copie locali dei file PRD se validi fuori dal repo).
- Ricordare che `--dangerously-skip-permissions` disabilita richieste di conferma CLI: usare solo in repository fidati e con backup branch.

**Permessi in modalità `-p` (non interattiva)**

In `-p`, `--dangerously-skip-permissions` ha effetto solo se il bypass è già stato accettato sulla macchina (`bypassPermissionsModeAccepted` in `~/.claude.json`); altrimenti viene ignorato e ogni Write/Edit è auto-negato. Ralph sceglie da solo la modalità:

- **Bypass completo (consigliato per Ralph):** una tantum, esegui `claude --dangerously-skip-permissions` in interattivo e accetta il warning → imposta `bypassPermissionsModeAccepted` in `~/.claude.json`. Da lì Ralph usa `--dangerously-skip-permissions --permission-mode bypassPermissions`.
- **Fallback senza bypass:** Ralph avvisa e usa `--permission-mode acceptEdits` (auto-approva gli edit nel cwd). Per build/test servono regole `permissions.allow` in `.claude/settings.local.json` del progetto per `git`, `python`/`py` e il path del venv (es. `.venv/Scripts/python.exe *` su Windows).
- **Troubleshooting:** se la guardia non scatta ma le scritture falliscono comunque, controlla che `~/.claude.json` non contenga chiavi `projects` duplicate con casing diverso (es. `C:/...` e `c:/...`): rompe `ConvertFrom-Json` in PowerShell 5.1 e Ralph ripiega su una lettura parziale del file.

## Come funziona

```text
prd.json → ralph-once.ps1 → Claude implementa US-001 → build → commit → ripeti
                                                                          ↓
                                                               tutte passes=true?
                                                                    → COMPLETE
```

1. **`prd.json`** — user stories da implementare + stack + libs da caricare
2. **`progress.txt`** — log di ciò che è stato fatto (aggiornato da Claude ad ogni iterazione)
3. **`bigplan.md`** — checklist opzionale del piano complessivo
4. **`ralph-once.ps1`** — singola iterazione (un context window, una storia)
5. **`ralph.ps1`** — loop completo per N iterazioni
6. **`ralph-parallel.ps1`** — orchestratore parallelo: storie indipendenti in worktree Git isolati

## Setup rapido

### 1. Prerequisiti nel progetto

Il progetto deve avere le libs collegate e la cartella `ralph/` sincronizzata:

```powershell
# Init completo (crea anche ralph/)
powershell -File "$env:CLAUDE_LIBS_PATH\scripts\setup\init-project.ps1" -Path C:\path\al\progetto -Stack dotnet

# Oppure aggiorna un progetto esistente (sync ralph incluso)
powershell -File "$env:CLAUDE_LIBS_PATH\scripts\setup\update-project.ps1" -Path C:\path\al\progetto
```

`ralph/` viene creato e aggiornato automaticamente da `init-project`, `update-project` e `reconcile`. I dati di progetto (`prd.json`, `progress.txt`, `run-state.json`, …) non vengono mai sovrascritti.

### 2. Compila prd.json

- **`prd.template.json`** — schema minimo di riferimento (stesso contenuto base di `prd.json` nella cartella Ralph copiata nel progetto).
- **`prd.json`** — file che Ralph legge a runtime nel progetto (generato partendo dal template o da `/ralph`).
- **`prd.schema.json`** — contratto JSON Schema (Draft 2020-12) con `stack`, `libs`, `userStories` tipizzati. In **claude-libs** la CI valida `prd.json`, `prd.template.json` e `examples/*.prd.json` contro questo file (`python scripts/validate/validate_prd_schema.py` dopo `pip install -r scripts/requirements-ci.txt`).
- **`examples/teams-transcriber.prd.json`** — esempio narrativo multi-storia (stack Electron); non è il PRD del repo claude-libs, solo dimostrativo.

Campi obbligatori:

```json
{
  "project": "NomeProgetto",
  "branchName": "ralph/nome-feature",
  "description": "Cosa implementa questa sessione Ralph",

  "stack": "dotnet",
  "libs": [
    "arch/clean-arch.md",
    "stacks/dotnet.md",
    "snippets/dotnet-patterns.md"
  ],

  "buildCommand": "dotnet build src/NomeProgetto/NomeProgetto.csproj",
  "testCommand": "dotnet test",

  "userStories": [ ... ]
}
```

**Libs consigliate per stack:**

| Stack | libs |
| --- | --- |
| dotnet | `arch/clean-arch.md`, `stacks/dotnet.md`, `snippets/dotnet-patterns.md` |
| spring | `arch/clean-arch.md`, `stacks/spring.md`, `snippets/spring-patterns.md` |
| nextjs | `stacks/nextjs.md` |
| nestjs | `arch/clean-arch.md`, `stacks/nestjs.md` |
| fastapi | `stacks/fastapi.md` |
| angular | `stacks/angular.md`, `snippets/angular-patterns.md` |
| electron | `stacks/electron.md`, `arch/clean-arch.md`, snippet/renderer da `stacks/component-libs.md` |

### 3b. Genera prd.json da un prompt (opzionale, via Ollama)

Invece di scriverlo a mano, puoi generarlo da una descrizione in linguaggio naturale con
il tool **esterno** `scripts/ralph/ralph_gen.py` (usa **Ollama locale**, non Claude Code):

```powershell
pip install -r /path/to/claude-libs/scripts/requirements-ralph-gen.txt

python /path/to/claude-libs/scripts/ralph/ralph_gen.py "CRUD prodotti con API REST e test" `
  --stack dotnet --build "dotnet build" --test "dotnet test" `
  --out C:\path\al\progetto\ralph\prd.json
# wrapper PowerShell: /path/to/claude-libs/scripts/ralph/ralph-gen.ps1 "..." --stack dotnet ...
```

Il tool: imposta in modo deterministico i campi wrapper (stack, libs da `schemas/stack-bundles.json`,
branch), chiede a Ollama **solo** le user story (con regole di dimensione/dipendenze/criteri
verificabili), le normalizza (id `US-00x`, `passes:false`, criterio "Il build passa"), **valida**
contro `prd.schema.json` (con un retry di repair) e scrive il file.

Opzioni utili: `--dry-run` (stampa senza scrivere), `--max-stories N`, `--force` (sovrascrive e
archivia la run precedente), `--model` / `--ollama-url` (default da `models.json` della libreria,
`qwen3-coder:30b` su `localhost:11434`; override via env `OLLAMA_MODEL` / `OLLAMA_URL` o
`<progetto>/.claude/models.json`). Prerequisiti: `ollama serve` attivo e
`ollama pull qwen3-coder:30b`. Rivedi sempre l'output prima di lanciare Ralph.

**Comando comodo `ralph-gen`** — se hai installato claude-libs con lo shim
(`install.ps1 -AddShim` o `install.sh --add-shim`), puoi invocarlo da qualunque cartella
senza il path completo: `ralph-gen "..." --stack dotnet --build "..." --test "..." --out ...`.
Lo script resta nel clone canonico (legge schema e bundle da lì): non viene copiato nel progetto.

### 4. Crea bigplan.md (opzionale)

File markdown con una checklist del piano complessivo. Ralph segnerà `[x]` sui task completati.

## Utilizzo

### Singola iterazione

```powershell
cd ralph
.\ralph-once.ps1
```

### Loop completo

```powershell
cd ralph
.\ralph.ps1 -Iterations 10
# Chiede interattivamente Claude o Cursor se -Runner non specificato

.\ralph.ps1 -Iterations 5 -Runner cursor
.\ralph-once.ps1 -Runner cursor
```

### Runner: Claude vs Cursor

| Runner | Backend | Prerequisiti |
| --- | --- | --- |
| `claude` (default) | Claude Code CLI | `claude` nel PATH, piano/API Anthropic |
| `cursor` | Cursor SDK (`scripts/ralph/cursor_run.py`) | **Python 3.12+**, `pip install -r scripts/requirements-ralph-cursor.txt` su quel Python, `CURSOR_API_KEY`, clone claude-libs registrato (`CLAUDE_LIBS_PATH`) |

Setup runner `cursor` (Windows):

```powershell
winget install Python.Python.3.12
py -3.12 -m pip install -r scripts/requirements-ralph-cursor.txt
```

Su Windows, `cursor_run.py` applica un workaround per `cursor-sdk` 0.1.7 (`WinError 10038` su pipe stderr); verrà rimosso quando il fix sarà upstream.

Variabili d'ambiente opzionali:

- `RALPH_RUNNER` — `claude` o `cursor` (fallback in modalità `-Json` se `-Runner` omesso)
- `RALPH_PREPOST_RUNNER` — `ollama` | `claude` | `none` (fallback se `-PrePostRunner` omesso)
- `RALPH_CLAUDE_MODEL` — modello Claude passato come `--model` alla CLI (default da `models.json`: `claude-opus-4-8`; senza valore si usa il modello di sessione)
- `RALPH_CURSOR_MODEL` — modello Cursor (default `composer-2.5`)
- `RALPH_PYTHON` — path esplicito a `python.exe` 3.12+ (es. `%LOCALAPPDATA%\Programs\Python\Python312\python.exe`) se `python` nel PATH è una versione precedente
- `CURSOR_API_KEY` — obbligatoria per runner `cursor` (o file `%USERPROFILE%\.cursor\cursor_api_key`, oppure `<progetto>\.claude\cursor.env`)

La cartella `ralph/lib/` contiene `Invoke-RalphRunner.ps1` (copiata da init-project). Per progetti esistenti senza `lib/`, copiala manualmente o riesegui init.

### Pre/post step su Ollama locale (risparmio token)

Il **pre-step** (session brief) e il **post-step** (riepilogo sessione in memoria) di `ralph.ps1`
sono pura sintesi: di default girano sul **modello locale Ollama** (`qwen3-coder:30b`, stesso
default di `ralph-gen` e `ollama-sidecar`) invece di consumare **2 run Claude completi a
sessione** con tutto il contesto caricato. Le iterazioni di implementazione restano sul runner
scelto (`claude`/`cursor`).

```powershell
.\ralph.ps1 -Iterations 10                        # pre/post su Ollama (default)
.\ralph.ps1 -Iterations 10 -PrePostRunner claude  # comportamento storico (run agente)
.\ralph.ps1 -Iterations 10 -PrePostRunner none    # salta pre/post step
```

- **Prerequisiti** (solo per il default `ollama`): `ollama serve` attivo e
  `ollama pull qwen3-coder:30b`; override con `OLLAMA_URL` / `OLLAMA_MODEL` / `OLLAMA_TIMEOUT`.
- **Best-effort, mai bloccante**: se Ollama non risponde il brief viene saltato (nessun fallback
  Claude implicito — re-introdurrebbe il costo) e il post-step si riduce alla sola riga
  `[POST-STEP]` su `progress.txt`, che ora è scritta **dallo script** in modo deterministico.
- Con `ollama` il riepilogo sessione viene appeso a `.claude/memory/sprint.md` sotto un heading
  `## Sessione Ralph <data>`; `decisions.md`/`tech-debt.md` restano coperti dal `contextSync`
  per-storia. Con `claude` il post-step aggiorna anche quei file come in passato.
- In `-Json` gli eventi `pre_step`/`post_step` riportano il campo `prePostRunner`
  (schema in `docs/script-outputs.md`).

### Da path diverso

```powershell
.\ralph\ralph.ps1 -Iterations 5 -ProjectDir "C:\dev\mio-progetto"
```

### Esecuzione parallela (worktree)

`ralph-parallel.ps1` esegue in parallelo le storie **indipendenti** — quelle con le
`dependsOn` già soddisfatte — ognuna in un **worktree Git isolato**
(`.ralph-worktrees/<US-id>`), poi fa il merge dei branch nel progetto. Riduce il tempo
totale quando il PRD ha storie scorrelate.

```powershell
# Piano a ondate (read-only, nessun agente avviato)
.\ralph\ralph-parallel.ps1 -WhatIf

# Avvio (max 3 agenti concorrenti, merge squash)
.\ralph\ralph-parallel.ps1 -MaxParallel 3 -MergeStrategy squash

# Dashboard live (legge agent-state.json, display-only)
.\ralph\ralph-parallel.ps1 -Monitor
```

| Flag | Default | Descrizione |
| --- | --- | --- |
| `-MaxParallel` | 3 | Agenti concorrenti |
| `-MergeStrategy` | `squash` | `squash` \| `merge` \| `rebase` |
| `-Mode` | — | Mode PromptOps passato a ogni agente |
| `-Runner` | `claude` | `claude` \| `cursor` |
| `-WhatIf` | — | Stampa le ondate ed esce, senza avviare agenti |
| `-Monitor` | — | Dashboard live da `agent-state.json` |

- Scheduling **dependency-aware**: a ogni ondata partono solo le storie con tutte le `dependsOn` già `passes:true`.
- Stato in `ralph/agent-state.json` (schema `agent-state.schema.json`); log per storia in `.ralph-worktrees/<US-id>.log`.
- In caso di **conflitto di merge** il worktree viene preservato per ispezione e la storia marcata in errore; le altre proseguono.
- `.ralph-worktrees/` è gitignorato.

> Il sequenziale (`ralph.ps1`) resta il default consigliato; usa il parallelo quando il PRD ha più storie davvero indipendenti.

## Stop graceful

Per fermare Ralph alla fine dell'**iterazione corrente** senza interrompere il processo a metà, crea il file `stop.signal` nella cartella `ralph/` del progetto:

```powershell
# PowerShell — ferma dopo l'iterazione corrente
New-Item -ItemType File "C:\dev\mio-progetto\ralph\stop.signal"
```

```bash
# Bash
touch /path/to/progetto/ralph/stop.signal
```

**Come funziona:**

- `ralph.ps1` / `ralph.sh` controlla il file **all'inizio di ogni nuova iterazione**.
- `ralph-once.ps1` / `ralph-once.sh` lo controlla **all'avvio**, prima di fare qualsiasi cosa.
- Il file viene **consumato e rimosso** automaticamente quando rilevato — non lascia residui.
- Ralph esce con codice `0` (successo).

Usa questo meccanismo invece di `Ctrl+C` per evitare di interrompere Claude a metà di un commit.

## Cosa fa Claude ad ogni iterazione

1. Legge il contesto: memoria progetto + libs dello stack + PRD + progress
2. Trova la user story con priorità più alta non ancora completata (`passes: false`)
3. Implementa la feature rispettando le convenzioni delle libs caricate
4. Verifica che il build (e i test) passino
5. Aggiorna `prd.json`, `progress.txt`, `bigplan.md`
6. Committa con messaggio Conventional Commits
7. **Se `contextSync` non è `false` in `prd.json`** (default `true`): esegue il workflow `workflows/story-context-sync.md` (iniettato nel prompt come step 9c) — aggiorna sprint.md, decisions.md e le convenzioni in CLAUDE.md via `ollama-sidecar` MCP se configurato; senza sidecar/Ollama degrada a solo sprint.md (best-effort, non blocca mai l'iterazione)
8. Se tutte le storie sono `passes: true` → output `<promise>COMPLETE</promise>`

### Fasi di iterazione (`iterationCommands`)

Il campo `iterationCommands` in `prd.json` elenca le fasi eseguite ad ogni iterazione (default:
`["review", "style-check", "security-check", "test", "changelog", "remember"]`). Ogni nome risolve
in quest'ordine:

1. **custom file** `.claude/commands/<nome>.md` se presente nel progetto (override su misura);
2. altrimenti la **skill first-party di Claude Code** equivalente, invocata via Skill tool:
   - `review` → `/code-review` (bug + cleanup sulla diff della storia)
   - `security-check` → `/security-review` (modifiche pendenti del branch)
   - `test` → `/verify` (esegue l'app per confermare la storia)
3. i nomi senza custom file né mapping built-in (es. `style-check`, `changelog`, `remember`) sono
   saltati con un avviso, salvo definire il rispettivo command file.

Così le fasi di review/sicurezza/verifica vengono eseguite davvero anche senza command file custom.

## Regole per le user stories

**Una storia per iterazione** — ogni storia deve essere completabile in un context window.

**Ordine dipendenze:**

1. Domain / Entità
2. Infrastructure (migration, repository)
3. Application (handler, validator)
4. Presentation (endpoint)
5. UI

**Criteri verificabili** — non "funziona bene" ma "endpoint ritorna 201 con body corretto".

Ogni storia deve includere: `"Il build passa"`.

Usa lo skill `/ralph` (in Cursor/Claude Code) per generare `prd.json` da un PRD esistente.

## Skills disponibili

- `skills/prd.md` — genera un PRD strutturato da una descrizione
- `skills/prd-to-ralph.md` — converte un PRD in `prd.json` per Ralph
- `skills/review-gate.md` — gate `/code-review` bloccante per storia (`reviewGate`)
- `skills/pull-request.md` — push + PR draft ad ogni storia (`pullRequest`)
- `skills/agent-team.md` — team di ruoli per storia (`agentTeam`)

## Team di ruoli (`agentTeam`)

Con `"agentTeam": true` nel `prd.json` (a livello PRD o sulla singola storia), ogni storia è
lavorata da una **pipeline di subagent** invece che da un singolo agente generalista. La
sessione di iterazione diventa orchestratore e delega via Task tool nell'ordine
**planner → implementer → tester → reviewer**:

| Ruolo (`ralph/agents/`) | Tool | Compito |
|-------------------------|------|---------|
| `ralph-planner` | read-only | Piano d'implementazione → `.claude/team/plan.md` |
| `ralph-implementer` | write+bash | Implementa il piano |
| `ralph-tester` | write+bash | Build/test verdi (loop di fix) |
| `ralph-reviewer` | read-only | Review+security bloccante (assorbe `reviewGate`) |

- `teamRoles` consente un team "lite" (es. `["implementer","reviewer"]`).
- `ralph-once.ps1` sincronizza i ruoli in `.claude/agents/` del progetto e crea `.claude/team/`
  (gitignored) per l'handoff — funziona anche dentro i worktree di `ralph-parallel.ps1`.
- Opt-in: una pipeline a 4 ruoli moltiplica token/latenza per storia. Default `false`.

Dettagli in `skills/agent-team.md` e `@.claude/libs/workflows/agent-team-reference.md`.

### Skill `frontend-design` (UI)

Su stack frontend (`nextjs`, `angular`, `react-native`, `electron`) e **runner Claude**, Ralph
riceve un nudge a usare la skill Claude Code `frontend-design` per le parti di UI (interfacce
curate, niente estetica generica). Vale sia nel flusso monolitico sia in `agentTeam` (il ruolo
`ralph-implementer` ha il tool `Skill`). La skill è installata dall'install globale di
claude-libs a `--scope user` (vedi `INSTALL.md`); il riferimento è **difensivo** ("se
disponibile"): no-op se installata con `-SkipPlugins` o sotto **runner Cursor** (i plugin di
Claude Code non sono disponibili lì).

## Schedulazione (avvio automatico giornaliero)

Per far partire Ralph **ogni giorno a un orario** in modo non presidiato, usa gli script
gemelli `scripts/schedule-ralph.ps1` (Windows Task Scheduler) e `scripts/schedule-ralph.sh`
(cron, Linux/macOS).

```powershell
# Windows: ogni giorno alle 02:00, 15 iterazioni
powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -Time 02:00 -Iterations 15
powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -DryRun   # anteprima
powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -Status   # stato/prossimo run
powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -Remove   # disinstalla
```

```bash
# Linux/macOS (richiede pwsh): ogni giorno alle 02:00
scripts/schedule-ralph.sh --project ~/dev/my-app --time 02:00 --iterations 15
scripts/schedule-ralph.sh --project ~/dev/my-app --dry-run
scripts/schedule-ralph.sh --project ~/dev/my-app --list
scripts/schedule-ralph.sh --project ~/dev/my-app --remove
```

- **Copia project-local**: dopo il reconcile gli script sono distribuiti anche nel progetto come
  `ralph/schedule-ralph.ps1` (`.sh`), invocabili senza dipendere dal path del clone:
  `powershell -File ralph/schedule-ralph.ps1 -ProjectDir .` (bash: `--project .`).
- **Non presidiato**: gli script passano sempre `-Runner` esplicito (default `claude`) per evitare
  il prompt interattivo di `ralph.ps1`.
- **Prerequisiti**: `claude` autenticato e in PATH per l'utente del task; su Linux/macOS serve
  `pwsh` (Ralph è PowerShell-only). Il task Windows gira "solo quando l'utente è loggato"
  (necessario per l'auth/PATH dell'utente).
- **Log**: ogni esecuzione appende a `<progetto>/ralph/logs/ralph-scheduled.log`.
- **Idempotente**: re-installare aggiorna senza duplicare (Win `-Force`; cron filtra per tag
  `# ralph-schedule:<nome>`). Lo `ClaudeLibsPath` viene cablato all'install per non dipendere
  dall'ambiente schedulato.
- Una sessione termina a `-Iterations` raggiunte o a PRD completo; combinabile con `agentTeam`.

## Integrazione con le libs

Ralph carica automaticamente le libs definite in `prd.json` all'inizio di ogni iterazione:

```text
@.claude/memory/MEMORY.md          ← contesto progetto (decisioni, dominio, sprint)
@.claude/libs/arch/clean-arch.md   ← convenzioni architetturali
@.claude/libs/stacks/dotnet.md     ← convenzioni .NET
@.claude/libs/snippets/dotnet-patterns.md  ← template codice
@ralph/prd.json                    ← user stories
@ralph/progress.txt                ← log iterazioni precedenti
@ralph/bigplan.md                  ← piano complessivo
```

Claude rispetta le convenzioni delle libs caricate quando scrive il codice — nomi, strutture, pattern.

## Credits

Ispirato al lavoro di Matt Pocock. Adattato e integrato con il sistema claude-libs.
