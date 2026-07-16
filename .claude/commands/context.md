# /context — Mostra contesto progetto

## Input
1. Carica sempre `@.claude/memory/MEMORY.md` (se esiste)
2. Suggerisci caricamento on-demand: `sprint.md`, `decisions.md`, `domain.md`, `conventions.md` in base alle domande dell'utente

## Regole
- Solo lettura — non modificare
- Se MEMORY.md vuoto, suggerisci `/remember`
- Salta file non esistenti senza errori

## Output
Riepilogo: progetto, stack, sprint corrente, decisioni chiave, dominio, convenzioni locali
