# /session-end — Debrief sessione

## Input
`git log --oneline --since="today"`, `git diff HEAD~5 HEAD`. `@.claude/memory/sprint.md`, `conventions.md`, `tech-debt.md`.
Se il server MCP `ollama-sidecar` è attivo, chiama `extract_tech_debt` con il diff per integrare item
di tech debt nella proposta di aggiornamento a `tech-debt.md`, e `summarize_session` (git log +
status) come bozza per task completati/in sospeso. Se la risposta include
`ollama_unavailable: true` (o `items: []` con `hint`), Ollama è offline: **non** bloccare il debrief —
estrai eventuale tech debt a mano dal diff e continua.

## Regole
- Non scrivere senza conferma esplicita
- Non duplicare info esistenti
- Aggiorna "Ultimo aggiornamento" nei file
- Segnala se merita `/remember`

## Output
Task completati, in sospeso, aggiornamenti sprint.md/tech-debt.md/conventions.md proposti
