# /multi-agent — Avvia sessione multi-agente

## Input
`ralph/prd.json`, `@.claude/memory/sprint.md`, `git branch --list`.

## Regole
- Non avviare agenti — prepara comandi
- Segnala dipendenze circolari
- Ogni agente sa cosa NON toccare
- Commit pulito su main prima di worktree

## Output
Piano divisione (per feature/layer/implementer-reviewer), comandi worktree/claude-squad/dmux, checklist merge
