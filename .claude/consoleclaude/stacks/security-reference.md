# Security — Pattern Trasversali (Reference)
> **Revisione doc:** 2026-04

> Contiene principi, tabelle e checklist (validazione, rate limiting, CSRF, secret, upload, logging), con esempi di header HTTP e CSP, costanti TypeScript, formato di log in JSON e comandi bash di scansione delle dipendenze; non ha codice .NET o Spring.

## Input Validation

### Principio: validare al boundary, mai fidarsi dell'input

```text
Client → [VALIDAZIONE] → Controller → Service → Domain → DB
                ↑
          Qui si blocca tutto l'input malformato o pericoloso
```

- Validare tipo, lunghezza, formato, range — non solo "campo obbligatorio"
- Whitelist (cosa è permesso) è sempre preferibile a blacklist (cosa è proibito)
- La validazione lato client è UX, non sicurezza — serve sempre la validazione server-side
- Non sanitizzare l'input per renderlo "sicuro" — rifiutare ciò che non rispetta il contratto

### Regole per tipo di dato

| Dato | Validazione |
|------|-------------|
| Email | Regex + max 254 chars + formato RFC |
| URL | Schema whitelist (`https://` only in prod) |
| Path file | Normalizza, verifica non esce dalla directory consentita |
| HTML/Markdown | Usa libreria di sanitizzazione (DOMPurify, HtmlSanitizer) — mai regex custom |
| ID numerico | Solo interi positivi, range ragionevole |
| Enum/stato | Solo valori della lista permessa |
| Testo libero | Max length, strip null bytes, no script tags |

---

## Rate Limiting

### Dove applicare

| Endpoint | Limite consigliato |
|----------|-------------------|
| Login | 5 tentativi / 15 min per IP |
| Registrazione | 3 / ora per IP |
| Password reset | 3 / ora per utente |
| API generica autenticata | 100 req / min per utente |
| API pubblica non autenticata | 20 req / min per IP |
| Upload file | 10 / ora per utente |

### Strategia sliding window vs fixed window

- **Fixed window**: più semplice, soggetto a burst al confine della finestra
- **Sliding window**: più preciso, usa Redis per contatori con TTL
- **Token bucket**: burst controllato — buono per API esterne che hanno picchi legittimi

### Headers di risposta

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1715000000
Retry-After: 60
```

---

## Security Headers

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

### Content Security Policy (CSP)

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.miodominio.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**Non usare `unsafe-eval` e `unsafe-inline` negli script.**

---

## CSRF Protection

### Quando serve

- Cookie-based session (il browser invia i cookie automaticamente)
- **Non serve** con Bearer token nell'Authorization header

### Pattern Double Submit Cookie

```text
1. Server genera token CSRF casuale, lo mette in cookie HttpOnly=false
2. Client legge il cookie e lo invia anche nell'header X-CSRF-Token
3. Server confronta cookie e header — devono corrispondere
```

### Pattern Synchronizer Token

```text
1. Server genera token, lo salva in sessione
2. Token inserito in ogni form HTML come hidden field
3. Server confronta token nel body con quello in sessione
```

---

## Secret Management

**Mai in chiaro nel codice sorgente. Mai in `.env` committato nel repository.**

### Gerarchia di sicurezza

```text
❌ Hardcoded nel codice
❌ .env nel repository
⚠️  Variabili d'ambiente del processo (sviluppo locale)
✅  Secret manager del cloud (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault)
✅  Kubernetes Secrets con encryption at rest
```

### Pattern per ambiente

| Ambiente | Approccio |
|----------|-----------|
| Sviluppo locale | `.env.local` in `.gitignore` + template `.env.example` senza valori |
| CI/CD | GitHub Secrets / Azure DevOps Variable Groups |
| Staging / Produzione | Azure Key Vault / AWS Secrets Manager integrato con il runtime |

### Rotazione secrets

- Secrets di servizio: rotazione ogni 90 giorni
- Secrets compromessi: rotazione immediata + audit log accessi
- Mai riutilizzare secrets tra ambienti

---

## File Upload Security

### Checklist

- [ ] **Validare tipo MIME server-side** — non fidarsi dell'estensione o del `Content-Type` del client
- [ ] **Limite dimensione** — impostato a livello di web server
- [ ] **Rinominare il file** — usare UUID generato, non il nome originale
- [ ] **Non salvare nella webroot** — il file non deve essere accessibile direttamente via HTTP
- [ ] **Path traversal**: normalizzare il path e verificare che resti nella directory consentita
- [ ] **Scan antivirus** per file che verranno aperti da altri utenti

```text
Nome file originale: ../../../etc/passwd        ← path traversal
                    <script>alert(1)</script>.jpg ← XSS nel filename
                    file.php.jpg                  ← doppia estensione

Nome file sicuro:   550e8400-e29b-41d4-a716-446655440000.jpg
```

### Tipi MIME consentiti

```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE_MB = 10;
```

---

## Logging di sicurezza

### Eventi da loggare obbligatoriamente

```text
✅ Login riuscito (utente, IP, timestamp)
✅ Login fallito (utente tentato, IP, motivo)
✅ Logout
✅ Cambio password
✅ Accesso negato (403) — utente, risorsa, operazione
✅ Rate limit raggiunto (IP, endpoint)
✅ Token scaduto / invalido
✅ Operazioni admin/privilegiate
✅ Export di dati sensibili
```

### Cosa NON loggare

```text
❌ Password (nemmeno quella sbagliata)
❌ Token JWT completi
❌ Dati di pagamento
❌ Dati personali non necessari al debug
```

### Formato consigliato

```json
{
  "timestamp": "2026-04-12T10:00:00Z",
  "event": "auth.login.failed",
  "severity": "warning",
  "userId": null,
  "username": "mario@example.com",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "reason": "invalid_password",
  "correlationId": "abc123"
}
```

---

## Dipendenze — Vulnerability Scanning

```bash
# .NET
dotnet list package --vulnerable --include-transitive

# Node / npm
npm audit
npm audit fix

# Python
pip-audit
safety check

# Java (Maven)
mvn dependency-check:check
```

---

## Regole generali

- **Defence in depth**: non affidarsi a un singolo controllo — strati multipli
- **Principle of least privilege**: ogni componente ha solo i permessi strettamente necessari
- **Fail secure**: in caso di errore, nega l'accesso — non concederlo
- **Separazione ambienti**: staging e produzione non condividono mai credenziali, DB, secrets
- **Audit trail immutabile**: i log di sicurezza non devono essere modificabili dall'app stessa
