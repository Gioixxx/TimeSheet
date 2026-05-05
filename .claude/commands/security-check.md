# /security-check — Verifica Sicurezza

Analizza il codice selezionato o il file corrente per vulnerabilità OWASP Top 10 e pattern insicuri comuni.

## Istruzioni

1. Leggi il codice selezionato o il file indicato dall'utente
2. Leggi `@.claude/memory/decisions.md` per capire il contesto architetturale (auth usata, DB, stack)
3. Identifica lo stack dal tipo di file e dal contesto

## Categorie da verificare

### A01 — Broken Access Control

- [ ] Ogni endpoint verifica autorizzazione (non solo autenticazione)?
- [ ] I controller non espongono operazioni che l'utente corrente non può fare?
- [ ] Gli ID nelle URL/body sono validati contro l'utente corrente (IDOR)?
- [ ] Le route admin/interne hanno middleware di protezione?

### A02 — Cryptographic Failures

- [ ] Dati sensibili non sono in chiaro nel DB (password, PAN, codice fiscale)?
- [ ] HTTPS forzato — nessun redirect HTTP→HTTPS mancante?
- [ ] Algoritmi di hashing sicuri per password (`bcrypt`, `Argon2`, non MD5/SHA1)?
- [ ] Secrets non in chiaro nel codice o nei log?

### A03 — Injection

- [ ] Query SQL usano parametri, non concatenazione di stringhe?
- [ ] ORM usato correttamente (no `.FromSqlRaw` con input utente non sanitizzato)?
- [ ] Input utente non finisce mai in `eval()`, `exec()`, shell command?
- [ ] Template engine non riceve input utente non escapato?

### A05 — Security Misconfiguration

- [ ] Errori dettagliati non esposti in produzione (stack trace, path interni)?
- [ ] Headers di sicurezza presenti (`X-Content-Type-Options`, `X-Frame-Options`, `CSP`)?
- [ ] CORS configurato con `AllowedOrigins` espliciti — non `*` in produzione?
- [ ] Directory listing disabilitato?

### A06 — Vulnerable Components

- [ ] Dipendenze nel file selezionato non hanno versioni con CVE noti?
- [ ] Versioni pinnate a patch specifiche (non range aperti `^`, `~` per dipendenze critiche)?

### A07 — Authentication Failures

- [ ] Rate limiting su endpoint di login/registrazione?
- [ ] Token JWT: `exp` presente? Algoritmo `RS256` o `HS256` (non `none`)?
- [ ] Cookie di sessione con `HttpOnly`, `Secure`, `SameSite=Strict`?
- [ ] Nessun secret in JWT payload non cifrato?

### A08 — Software and Data Integrity

- [ ] Deserializzazione di input utente non usa tipi non fidati?
- [ ] Nessun `JsonConvert.DeserializeObject` con tipi dinamici su input utente?

### A10 — Server-Side Request Forgery (SSRF)

- [ ] URL costruiti da input utente sono validati contro una whitelist?
- [ ] Nessun fetch/HttpClient che accetta URL arbitrari dall'esterno?

---

## Output atteso

Per ogni problema trovato, mostra:

**[CATEGORIA] — Severità: Alta / Media / Bassa**
```
File: path/al/file.ts, riga X
Problema: [descrizione precisa]
Codice vulnerabile:
  [snippet]
Fix suggerito:
  [snippet corretto]
```

Se non ci sono problemi:

```
✅ Nessuna vulnerabilità rilevata nelle categorie verificate.
Note: [eventuali osservazioni minori o pattern da monitorare]
```

---

## Regole

- Segnala solo problemi reali nel codice analizzato — non ipotesi teoriche su codice non visto
- Distingui chiaramente Alta (exploit diretto possibile) / Media (richiede condizioni) / Bassa (best practice)
- Per ogni problema, mostra sempre il fix — non solo il problema
- Non modificare nessun file — solo analisi e suggerimenti
- Se il codice usa un pattern di sicurezza custom (es. validazione centralizzata), chiedi conferma prima di segnalarlo come problema
