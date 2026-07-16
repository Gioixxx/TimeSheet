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