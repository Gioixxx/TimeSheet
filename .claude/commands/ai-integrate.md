# /ai-integrate — Integra LLM nel progetto

## Input
Stack da MEMORY.md o utente. Carica stack snippet AI + `stacks/ai-integration.md`. Context7 per doc aggiornate.

## Regole
- 6 step: contesto → use case → analisi → proposta → implementazione → verifica
- Solo variabili d'ambiente per API key
- LLM isolato in layer dedicato, system prompt separato
- Streaming per output lunghi, retry per rate limit

## Output
Proposta architetturale, codice per config → service → endpoint, verifica sicurezza/performance
