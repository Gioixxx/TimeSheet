# /scope — Analisi Impatto Pre-Coding

Prima di iniziare un task, analizza l'impatto: quali file cambiano, quali test servono, cosa potrebbe rompersi.

## Istruzioni

1. Chiedi all'utente: "Descrivi il task che vuoi iniziare"
2. Leggi `@.claude/memory/MEMORY.md` per capire lo stack e l'architettura
3. Leggi `@.claude/memory/decisions.md` per le decisioni rilevanti
4. Leggi `@.claude/memory/conventions.md` per le convenzioni locali
5. Esegui `git log --oneline -5` per vedere il contesto recente
6. Esplora i file rilevanti per il task descritto dall'utente

## Analisi da produrre

**a) File coinvolti**
Individua i file che quasi certamente dovranno essere modificati, distinti per tipo:
- File principali (logica core del task)
- File correlati (che dipendono dai precedenti o che impattano)
- File di test da creare o aggiornare
- File di configurazione o migration (se applicabile)

**b) Dipendenze e rischi**
- Quali altri moduli o layer dipendono dai file coinvolti?
- Ci sono side effect probabili?
- Ci sono vincoli architetturali da rispettare (da decisions.md o conventions.md)?

**c) Complessità stimata**
- Piccola (< 30 min, 1-3 file): fai direttamente
- Media (30-90 min, 3-8 file): descrivi piano prima
- Grande (> 90 min o dipendenze esterne): spezza in subtask

**d) Prerequisiti**
Cosa deve essere vero prima di iniziare:
- Branch pulito? Migration pending? Config da aggiornare?

## Output atteso

---

**Scope: [nome task]**

**File da modificare**
- `path/al/file.ts` — [perché]
- `path/al/altro.ts` — [perché]

**File da creare**
- `path/al/nuovo.ts` — [cosa conterrà]

**Test da aggiornare/creare**
- `path/al/test.spec.ts` — [cosa testare]

**Rischi**
- [rischio 1 — probabilità alta/media/bassa]
- [rischio 2]

**Stima complessità:** Piccola / Media / Grande
**Prerequisiti:** [lista o "nessuno"]

**Suggerimento:** [approccio raccomandato per iniziare — primo file da toccare, ordine logico]

---

## Regole

- Non scrivere codice — solo analisi
- Se il task è ambiguo, chiedi chiarimenti prima di procedere
- Se la complessità è Grande, proponi la scomposizione in subtask prima di chiudere l'output
- Segnala esplicitamente se il task tocca aree sensibili: auth, pagamenti, migration dati, API pubbliche
- Non modificare nessun file di memoria — solo lettura e output
