# /context-prune — Ottimizza i moduli caricati nel contesto

Analizza i moduli claude-libs attualmente caricati (CLAUDE.md + mode-override.md) e propone una versione più leggera eliminando ridondanze, moduli non pertinenti al task corrente e duplicazioni implicite.

## Input

- `CLAUDE.md` del progetto — tutti i `@.claude/libs/` attivi
- `.claude/mode-override.md` — se presente, moduli caricati dal mode attivo
- `.claude/active-mode.json` — mode corrente
- Task o obiettivo corrente fornito dall'utente (es. "sto solo debuggando un endpoint", "sto scrivendo test", "refactoring del dominio")
- `@.claude/memory/conventions.md` per capire le scelte progettuali consolidate
- `~/.claude/libs-usage.json` se accessibile — ranking moduli più usati

## Regole

- Non modificare nessun file — solo analisi e proposta
- Proponi solo rimozioni sicure: non suggerire mai di rimuovere il modulo dello stack primario o `workflows/iterative-dev.md`
- Un modulo è **ridondante** se: (a) sia X.md che X-reference.md sono caricati e la sessione non richiede esempi di codice dettagliati, oppure (b) sia lo snippet che il modulo stack sono caricati e il task è solo architetturale
- Un modulo è **non pertinente** se il suo dominio non ha relazione con il task corrente (es. `stacks/docker.md` caricato mentre il task è solo refactoring del dominio)
- Un modulo è **sostituibile** se esiste una versione più leggera (es. il `-reference.md` completo può essere rimosso lasciando solo il `.md` base)
- Mantieni sempre i moduli legati alla sicurezza se il task tocca auth, API pubbliche o input utente
- Segnala se il mode attivo aggiunge moduli già nel CLAUDE.md (duplicazione mode)
- Compatibile con `usage_analytics`: se il ranking è disponibile, segnala i moduli meno usati come candidati alla rimozione

## Procedura

### Step 1 — Inventario
Elenca tutti i moduli caricati, separando: CLAUDE.md base vs mode-override aggiuntivi.

### Step 2 — Classificazione per task
Per ogni modulo, valuta la pertinenza rispetto al task corrente:
- **Core** (non toccare): stack primario, arch principale, iterative-dev
- **Pertinente**: direttamente utile per il task
- **Opzionale**: utile ma non essenziale per questo task specifico
- **Ridondante**: duplicato implicito o coperto da un altro modulo già caricato
- **Non pertinente**: dominio non correlato al task

### Step 3 — Proposta contesto ottimizzato
Costruisci la lista `@path` ridotta mantenendo solo Core + Pertinente, con annotazioni per gli Opzionali che potrebbero servire.

## Output

```
/context-prune — task: "<task corrente>"

INVENTARIO (12 moduli caricati)
  Base CLAUDE.md:      9 moduli
  Mode (architect):    3 moduli aggiuntivi

ANALISI
  ✅ Core (non toccare):       3  (dotnet, clean-arch, iterative-dev)
  ✅ Pertinenti al task:       4  (api-design, testing, dotnet-patterns, debug)
  ⚠️  Opzionali:               2  (docker, ci-cd)
  🗑️  Ridondanti:              2  (dotnet-reference.md → coperto da dotnet.md, multi-agent → non task attuale)
  ❌ Non pertinenti:           1  (animation → task è backend puro)

CONTESTO OTTIMIZZATO (7 moduli → risparmio ~42%)
  @.claude/libs/arch/clean-arch.md
  @.claude/libs/arch/api-design.md
  @.claude/libs/stacks/dotnet.md
  @.claude/libs/snippets/dotnet-patterns.md
  @.claude/libs/workflows/iterative-dev.md
  @.claude/libs/workflows/testing.md
  @.claude/libs/workflows/debug.md

RIMOSSI (sicuri da omettere per questo task)
  stacks/dotnet-reference.md   — dettagli già coperti da dotnet.md per questo task
  workflows/multi-agent.md     — non rilevante per debugging singolo endpoint
  stacks/animation.md          — dominio non correlato
  stacks/docker.md             — infrastruttura non toccata

OPZIONALI (aggiungi se il task evolve)
  stacks/docker.md             — se il task tocca il deployment
  stacks/ci-cd.md              — se il task include pipeline changes

NOTE MODE
  Mode architect aggiunge workflows/documentation.md — già coperto dal task? Valuta se disattivare il mode.
```
