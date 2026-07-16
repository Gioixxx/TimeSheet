# /changelog — Genera CHANGELOG

## Input
`git tag`, `git log [tag]..HEAD` o `--since="data"`. `@.claude/memory/MEMORY.md` per versione.
Se il server MCP `ollama-sidecar` è attivo, chiama `draft_changelog_entry` (commit log + diff) per la
bozza già strutturata Breaking/Aggiunto/Corretto/Modificato; `summarize_diff` resta utile come
arricchimento opzionale per le voci complesse. In assenza del sidecar (`ollama_unavailable: true`),
usa il messaggio di commit come fonte primaria.

## Regole
- Formato Keep a Changelog: Breaking Change → Aggiunto → Corretto → Modificato
- Riscrivi commit in linguaggio naturale (utente)
- Ometti merge, bump versione, dipendenze minori
- Non inventare versione — usa quella indicata

## Output
Sezione CHANGELOG pronta, chiedi conferma prima di scrivere
