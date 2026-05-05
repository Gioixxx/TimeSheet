# Ralph — Sviluppo Autonomo Iterativo

Sistema di sviluppo autonomo che esegue Claude in loop, implementando una user story per volta fino al completamento del PRD.

> **USARE CON CAUTELA** — Ralph esegue modifiche al codice in autonomia con `--dangerously-skip-permissions`.
> Assicurarsi di avere un commit pulito prima di avviare.

**Pre-flight consigliato**

- Working tree Git **pulito** (o commit/WIP consapevole): facilita rollback e review del loop.
- Validare `prd.json` contro `prd.schema.json` nel repo **claude-libs** prima di lunghe sessioni:  
  `pip install -r /path/to/claude-libs/scripts/requirements-ci.txt` →  
  `python /path/to/claude-libs/scripts/validate_prd_schema.py` (usa copie locali dei file PRD se validi fuori dal repo).
- Ricordare che `--dangerously-skip-permissions` disabilita richieste di conferma CLI: usare solo in repository fidati e con backup branch.

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

## Setup rapido

### 1. Prerequisiti nel progetto

Il progetto deve avere le libs collegate:

```powershell
bash /path/to/claude-libs/scripts/init-project.sh C:\path\al\progetto dotnet
```

### 2. Copia la cartella ralph nel progetto

```powershell
cp -r /path/to/claude-libs/ralph C:\path\al\progetto\ralph
```

### 3. Compila prd.json

- **`prd.template.json`** — schema minimo di riferimento (stesso contenuto base di `prd.json` nella cartella Ralph copiata nel progetto).
- **`prd.json`** — file che Ralph legge a runtime nel progetto (generato partendo dal template o da `/ralph`).
- **`prd.schema.json`** — contratto JSON Schema (Draft 2020-12) con `stack`, `libs`, `userStories` tipizzati. In **claude-libs** la CI valida `prd.json`, `prd.template.json` e `examples/*.prd.json` contro questo file (`python scripts/validate_prd_schema.py` dopo `pip install -r scripts/requirements-ci.txt`).
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
```

### Da path diverso

```powershell
.\ralph\ralph.ps1 -Iterations 5 -ProjectDir "C:\dev\mio-progetto"
```

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
7. Se tutte le storie sono `passes: true` → output `<promise>COMPLETE</promise>`

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
