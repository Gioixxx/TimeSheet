# /ralph — Prepara sessione Ralph

## Input
Descrizione feature o `ralph/prd.json` esistente. `@.claude/libs/ralph/skills/prd-to-ralph.md` per conversione.

## Regole
- Non avviare Ralph — prepara solo
- Verifica prd.json: stack, libs, buildCommand obbligatori
- Storie completabili in 1 iterazione, ordinate per dipendenza
- Per feature sensibili proponi `reviewGate: true` (gate /review bloccante per storia — vedi `ralph/skills/review-gate.md`)
- Per visibilità in review continua proponi `pullRequest: true` (push + PR draft ad ogni storia — vedi `ralph/skills/pull-request.md`)
- Checklist: `.claude/libs/`, `MEMORY.md`, git pulito

## Output
prd.json, bigplan.md, progress.txt, riepilogo storie, comandi avvio
(sequenziale `ralph-once.ps1`/`ralph.ps1`; parallelo su worktree con `ralph-parallel.ps1` se le storie sono indipendenti — vedi `ralph/README.md`)
