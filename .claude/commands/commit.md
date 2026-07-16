# /commit — Genera messaggio di commit

## Input
`git diff --staged` o `git diff`. `@.claude/memory/conventions.md` per convenzioni commit.
Se il server MCP `ollama-sidecar` è attivo, chiama `draft_commit_message` con il diff per una
bozza conventional-commit, poi rifiniscila rispetto a `conventions.md`. Se la risposta include
`ollama_unavailable: true`, genera il messaggio direttamente dal diff.

## Regole
- Solo output — non eseguire commit
- Formato Conventional Commits (type(scope): descrizione)
- Spiega il PERCHÉ, non il COSA
- Suggerisci split se modifiche eccessive

## Output
Messaggio pronto per copia/incolla, multipli se necessario
