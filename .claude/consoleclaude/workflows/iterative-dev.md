---
triggers: sviluppo iterativo | piccoli incrementi | piano implementazione
---
# Workflow: Sviluppo Iterativo — Regole

> **Revisione doc:** 2026-10

## Principio

Lavora in piccoli incrementi verificabili. Ogni step deve essere compilabile, eseguibile e verificabile. Non scrivere centinaia di righe in una volta.

## Regole

- **Ciclo fisso**: ANALISI → PIANO → IMPLEMENT → VERIFICA → REPORT
- **Prima di modificare un file**: leggi per intero i file corti; dei lunghi la parte che cambi, con dipendenze e chiamanti. Segnala i cambiamenti a cascata
- **Feature dall'alto verso il basso**: interfaccia/contratto → dominio → infrastruttura → UI
- **Task piccolo** (< 30 min): implementa direttamente
- **Task medio** (30-90 min): descrivi il piano, poi implementa
- **Task grande** (> 90 min): spezza in subtask, lavora su uno alla volta
- **Dopo 2 tentativi falliti**: fermati e chiedi, non girare in loop
- **Task meccanici** (sintesi, classificazione, brief, riassunti): se in sessione ci sono gli strumenti `mcp__ollama-sidecar__*`, delegali a loro prima di farli tu (regole in `.claude/consoleclaude/workflows/token-economics.md`); se non ci sono, falli tu
- **Commit message**: `type(scope): descrizione` — tipi: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`; tag e rilascio: `.claude/consoleclaude/workflows/git-release.md`

## Pattern

- **Problemi fuori task**: segnala con `⚠️ NOTA:` ma non fixarli; crea TODO commentato se critico
- **Comunicazione**: ✅ completato, 🔄 in corso, ⚠️ warning, ❌ errore bloccante, 💡 suggerimento
- **Piano complesso**: chiedi conferma prima di implementare

## Reference → `.claude/consoleclaude/workflows/iterative-dev-reference.md`
