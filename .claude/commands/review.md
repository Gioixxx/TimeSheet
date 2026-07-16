# /review — Code review

## Input
Codice selezionato o file corrente. `@.claude/memory/conventions.md`.
Se il server MCP `ollama-sidecar` è attivo e la review parte da un diff, chiama `review_diff` come
primo passaggio: **verifica** ogni finding sul codice prima di riportarlo, mai riportarlo cieco.
Se `ollama_unavailable: true`, procedi con la review diretta.

## Regole
- Max 10 punti totali — prioritizza
- Mostra sempre codice corretto, non solo critica
- Sii diretto — no commenti vaghi
- Se codice corretto, dillo chiaramente

## Output
✅ Cosa va bene, ⚠️ Miglioramenti (con fix), ❌ Bloccanti, 💡 Suggerimenti opzionali
