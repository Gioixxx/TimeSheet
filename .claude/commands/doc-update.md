# /doc-update — Sincronizza documentazione esistente

## Input
Intervallo (sessione/sprint/custom). `git diff --name-only`, `@.claude/memory/sprint.md`, `decisions.md`. Cerca doc correlata a file modificati.

## Regole
- Solo report — non modificare file
- Non generare doc — delega a `/doc`
- Distingui "stale" da "mancante"
- Se >20 file, chiedi di circoscrivere

## Output
Report: doc da aggiornare (stale), doc mancante, doc OK, azioni suggerite
