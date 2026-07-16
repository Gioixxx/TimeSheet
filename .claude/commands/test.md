# /test — Genera test

## Input
Codice selezionato o file corrente. Stack detection. `@.claude/memory/conventions.md`. Context7 per API framework test.

## Regole
- Test documentano comportamento — no test banali
- Un test = una asserzione logica
- Mock solo dipendenze esterne (DB, HTTP, FS)
- Nomi in italiano: "dovrebbe..."
- Segnala se codice non testabile

## Output
Setup, happy path, edge case, error case per ogni test
