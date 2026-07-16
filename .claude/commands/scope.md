# /scope — Analisi impatto pre-coding

## Input
Descrizione task. `@.claude/memory/MEMORY.md`, `decisions.md`, `conventions.md`. `git log --oneline -5`. Esplora file rilevanti.

## Regole
- Solo analisi — non scrivere codice
- Se task ambiguo, chiedi chiarimenti
- Se Grande, proponi scomposizione
- Segnala aree sensibili (auth, pagamenti, migration, API pubbliche)

## Output
File da modificare/creare, test, rischi, stima complessità, prerequisiti, suggerimento approccio
