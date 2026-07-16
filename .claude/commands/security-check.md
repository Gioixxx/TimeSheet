# /security-check — Verifica sicurezza OWASP Top 10

## Input
Codice selezionato. `@.claude/memory/decisions.md` per contesto. Stack detection.

## Regole
- Checklist: A01-A03, A05-A08, A10 (Access, Crypto, Injection, Config, Components, Auth, Integrity, SSRF)
- Solo problemi reali — no ipotesi teoriche
- Distingui Alta/Media/Bassa
- Mostra sempre il fix

## Output
Problema + codice vulnerabile + fix per categoria, ✅ se nessun problema
