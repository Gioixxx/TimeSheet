# /analyze — Analisi Codebase

Analizza la struttura e l'architettura del progetto corrente o di una sezione specifica.

## Istruzioni

1. Se è specificato un path o un modulo, analizza solo quello. Altrimenti analizza l'intero progetto.
2. Carica il contesto di progetto da `@.claude/memory/MEMORY.md` se esiste
3. Carica le decisioni architetturali da `@.claude/memory/decisions.md` se esiste
4. Esplora la struttura delle cartelle e i file principali
5. Identifica lo stack tecnologico, i pattern usati, le dipendenze chiave

**Context7 (se disponibile):** per dipendenze con versioni specifiche, verifica API deprecate o breaking changes:

```text
use context7 to get documentation for [nome-pacchetto]
```

**GitHub MCP (se disponibile):** per pattern architetturali non standard, cerca implementazioni di riferimento:

```text
search GitHub for examples of "[pattern] [stack]"
```

## Output atteso

**Stack e dipendenze** — tecnologie rilevate, versioni principali, librerie chiave

**Struttura architetturale** — come è organizzato il codice, quali layer esistono, come comunicano

**Pattern rilevati** — CQRS, Repository, DI, Event-driven, ecc.

**Conformità alle convenzioni** — rispetto alle librerie caricate (se presenti), cosa segue le regole e cosa diverge

**Problemi architetturali** — dipendenze circolari, violazioni del layering, responsabilità miste

**Mappa delle dipendenze critiche** — quali moduli/servizi dipendono da cosa

## Regole

- Non modificare nulla — solo analisi
- Se trovi divergenze dalle convenzioni del progetto, segnalale con `⚠️` ma non correggerle automaticamente
- Se mancano test, segnalalo
- Concludi con una lista prioritizzata di 3-5 azioni raccomandate
