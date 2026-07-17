# Decisioni Architetturali

Registro delle scelte tecniche rilevanti prese durante lo sviluppo.
Ogni decisione include motivazione e alternative valutate.

---

<!-- TEMPLATE PER NUOVA DECISIONE:

### [Titolo breve]
**Data:** YYYY-MM-DD
**Decisione:** [cosa si è scelto di fare]
**Perché:** [motivazione — vincoli tecnici, requisiti, trade-off]
**Alternative scartate:** [cosa si è valutato e perché no]
**Impatto:** [moduli o aree del codice coinvolti]

-->

### Autenticazione single-user con sessione stateless (jose) + proxy.ts, solo per il deploy web

**Data:** 2026-07-16
**Decisione:** Aggiunta una maschera di login perché l'istanza Docker su CasaOS è esposta su internet. Approccio: modello `User` in Prisma (username + password hash con `crypto.scrypt`, nessuna nuova dipendenza), sessione stateless firmata con JWT (`jose`, libreria raccomandata dalla guida ufficiale Next.js per questa versione — vedi `node_modules/next/dist/docs/01-app/02-guides/authentication.md`) in un cookie httpOnly, verificata in `src/proxy.ts` (rinominato da `middleware.ts` in Next 16 — vedi `proxy.md`). Al primo avvio, se non esiste ancora nessun `User`, `/setup` permette di creare l'unico account; una volta creato si blocca e redirige a `/login`. Tutto è gated dietro il flag `AUTH_ENABLED` (env var), non da una libreria di auth (next-auth/authjs) per restare aderenti alla filosofia "zero cloud, dipendenze minime" del progetto.
**Perché:** L'app gira sia come eseguibile Electron desktop locale (mai esposto, stesso codice) sia come container Docker sul Pi/CasaOS dell'utente (esposto pubblicamente). Serve login solo nel secondo caso — da qui il flag `AUTH_ENABLED`, non impostato per Electron/dev locale, impostato a `"true"` in `docker-compose.yml` per il deploy web. La sessione dura fino a logout esplicito (richiesta utente): cookie con `maxAge` di 400 giorni, il massimo consentito dai browser (Chrome) per Max-Age/Expires — non esiste un modo per impostare "mai" in modo affidabile lato browser.
**Alternative scartate:** next-auth/Auth.js — scartato per mantenere zero dipendenze pesanti e perché il progetto non ha bisogno di OAuth/provider esterni per un singolo utente. HMAC fatto a mano invece di `jose` — scartato perché la guida ufficiale Next.js raccomanda esplicitamente una libreria matura per la firma delle sessioni (rischio di bug sottili in un'implementazione custom).
**Impatto:** `prisma/schema.prisma` (nuovo model `User`), `src/lib/session.ts`, `src/lib/password.ts`, `src/lib/dal.ts`, `src/lib/auth-actions.ts`, `src/proxy.ts`, `src/app/login/`, `src/app/setup/`, `src/components/Navbar.tsx` (pulsante logout), i 5 Route Handler sotto `src/app/api/*` (guardia `requireApiAuth()` come difesa aggiuntiva, il proxy resta la protezione primaria). Secret di firma (`AUTH_SECRET`) auto-generato e persistito su `/data/.auth-secret` nel volume Docker se non impostato esplicitamente — zero configurazione manuale richiesta. Vedi [[backlog]] per le migliorie rimandate (cambio password, auth check nelle singole Server Action).

### Cookie di sessione non-Secure su `myservergio.duckdns.org` (istanza HTTP, senza TLS davanti)

**Data:** 2026-07-17
**Decisione:** Aggiunto `COOKIE_SECURE` (env var, default = comportamento precedente basato su `NODE_ENV`) in `src/lib/session.ts` per rendere configurabile il flag `Secure` del cookie `ts_session`, e impostato `COOKIE_SECURE: "false"` in `docker-compose.yml` per questa istanza.
**Perché:** Bug riportato dall'utente: click su "Calendario"/"Oggi" reindirizzava sempre al login pur essendo autenticati. Causa: `NODE_ENV=production` (sempre vero nell'immagine Docker) marcava il cookie `Secure`, ma l'istanza è raggiunta su `http://myservergio.duckdns.org:3000` **senza TLS** — il browser scarta silenziosamente un cookie `Secure` ricevuto su HTTP semplice, quindi la sessione non veniva mai persistita. Il sintomo sembrava specifico a Calendario/Oggi solo perché sono i link cliccati più di frequente (ogni click forza una navigazione fresca); in realtà **ogni** route protetta falliva alla prima richiesta di rete non servita dalla cache client-side del router Next.js — verificato con `fetch(url, {credentials:'include', cache:'no-store'})` diretto dalla console del browser, che bypassa sia il router cache sia qualunque prefetch.
**Nota metodologica:** non fidarsi della percezione dell'utente su "quali route sono affette" quando è in gioco la cache del router Next.js — un `<Link>` già visitato/prefetchato può mascherare un fallimento di autenticazione mostrando contenuto stale in memoria. Verificare sempre con una richiesta di rete forzata (`cache:'no-store'`) prima di restringere la diagnosi.
**Alternative scartate:** reverse proxy con TLS (Caddy + Let's Encrypt via DuckDNS) — è il fix corretto dal punto di vista della sicurezza (oggi login e sessione viaggiano in chiaro su internet), ma rimandato su richiesta esplicita dell'utente per sbloccare subito la funzionalità; da rivalutare, vedi [[backlog]].
**Impatto:** `src/lib/session.ts` (funzione `isCookieSecure()`), `docker-compose.yml`. Correzione difensiva collaterale nello stesso giro di debug: `public/sw.js` non mette più in cache risposte redirected/non-ok e non precarica più `/calendario` all'install (evita di "avvelenare" la cache PWA con la pagina di login se il service worker si installa da non autenticato) — non era la causa di questo bug ma un rischio reale comunque presente.

### Polling email in-process via `instrumentation.ts` per il deploy Docker

**Data:** 2026-07-16
**Decisione:** `src/instrumentation.ts` avvia un `setInterval` in-process (5 min, stesso ritmo di `electron/main.cjs`) che chiama `pollEmails()`, disattivo se `ELECTRON_RUN_AS_NODE` è settato.
**Perché:** Il container Docker non aveva mai avuto un trigger per `/api/email-poll` — il polling esisteva solo come side-effect del processo Electron. Sull'istanza esposta su internet nessuna email veniva mai recuperata da quando la feature email-to-task è stata introdotta (bug preesistente, scoperto solo testando il flusso end-to-end).
**Alternative scartate:** sidecar/cron in `docker-compose.yml` — scartato per restare aderenti alla filosofia "zero dipendenze aggiuntive"; l'hook `instrumentation.ts` (stabile da Next.js v15) copre il caso senza servizi in più.
**Impatto:** `src/instrumentation.ts` (nuovo). Nessuna modifica a `docker-compose.yml`/`.env`, quindi deploy fatto con `force_update` invece di `deploy_app` — vedi [[tech-debt]].