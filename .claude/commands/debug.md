# /debug — Protocollo debug strutturato

## Input
Errore, file/endpoint, riproduzione. Brave Search per errori sconosciuti, Context7 per API deprecate.

## Regole
- 6 step: riproduzione → stack trace → ipotesi → verifica → fix → prevenzione
- Fix minimale — no refactoring
- Max 2 tentativi prima di chiedere aiuto
- Non modificare codice non correlato

## Output
Ipotesi con probabilità, verifica, fix con diff, suggerimenti prevenzione
