---
triggers: owasp | sicurezza applicativa | vulnerabilita
---
# Security — Pattern Trasversali
> **Revisione doc:** 2026-10

## Principio
Defence in depth: validazione al boundary, rate limiting, security headers, secret management e audit trail per ogni stack.

## Regole
- Validare al boundary: tipo, lunghezza, formato, range — whitelist preferibile a blacklist
- Mai fidarsi della validazione client — sempre server-side
- Non sanitizzare l'input, rifiutare ciò che non rispetta il contratto
- Secrets mai hardcoded né committati — usare secret manager (Key Vault, AWS SM, Vault)
- Non loggare password, token JWT, dati di pagamento
- Rate limit su login: 5 tentativi / 15 min per IP
- File upload: validare MIME server-side, rinominare con UUID, non salvare nella webroot
- File upload: limite dimensione a livello web server, scan antivirus per file condivisi
- Security headers su ogni risposta: nosniff, DENY/SAMEORIGIN frame, HSTS, CSP
- CSP: mai `unsafe-eval` o `unsafe-inline` negli script
- CSRF necessario solo con cookie session, non con Bearer token
- Events di sicurezza obbligatori in audit log: login, logout, accessi negati, rate limit, operazioni admin
- Vulnerability scanning nel CI prima del deploy; lockfile committato e installazione riproducibile (supply chain, A03:2025)
- Fail closed: in caso di errore si nega, nessuno stack trace o dettaglio interno nelle risposte (A10:2025)
- Chiamate HTTP in uscita verso URL forniti dall'utente solo su allowlist (SSRF, parte di A01:2025)

## Per stack
| Stack | Validation | Rate Limiting | Secret Manager |
|-------|-----------|---------------|----------------|
| .NET | FluentValidation | RateLimiter middleware (built-in) | Azure Key Vault |
| Spring | Bean Validation | Bucket4j | HashiCorp Vault |
| Node/NestJS | class-validator | express-rate-limit | AWS Secrets Manager |
| FastAPI | Pydantic v2 | slowapi | AWS Secrets Manager |
| Next.js | Zod | express-rate-limit | Vercel Env Vars |

## Reference → `.claude/consoleclaude/stacks/security-reference.md`
