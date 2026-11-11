# Convenzioni Locali

Pattern e regole specifiche di questo progetto che divergono o integrano le librerie globali.
Caricate da Claude durante review e generazione di codice.

---

<!-- TEMPLATE PER NUOVA CONVENZIONE:

### [Nome convenzione]
**Contesto:** [quando si applica]
**Regola:** [descrizione precisa]
**Esempio:**
```
[codice o pattern concreto]
```
**Perché diverge dalle libs globali:** [motivazione — es. vincolo legacy, decisione team, requisito cliente]

-->

## Struttura cartelle

[Documenta qui eventuali variazioni dalla struttura standard delle libs]

## Naming

[Documenta qui convenzioni di naming specifiche del progetto]

## Pattern ricorrenti

### Flag AUTH_ENABLED per il gate del login
**Contesto:** L'app gira sia come eseguibile Electron locale (mai esposto) sia come Docker su CasaOS/Pi (esposto su internet). Serve login solo nel secondo caso.
**Regola:** Tutto il codice legato all'autenticazione (`src/proxy.ts`, `src/lib/dal.ts`, i `requireApiAuth()` nei Route Handler, le pagine `/login`/`/setup`) controlla `isAuthEnabled()` (`process.env.AUTH_ENABLED === 'true'`) prima di applicare qualunque restrizione. Se il flag è assente/false, l'app si comporta come prima del login (nessuna verifica). `docker-compose.yml` imposta `AUTH_ENABLED: "true"`; Electron e `npm run dev` non lo impostano.
**Perché diverge dalle libs globali:** Singolo codebase con due target di deploy con esigenze di sicurezza opposte — non c'è un pattern generico nelle libs per questo caso.
**Vedi anche:** [[decisions]] per il dettaglio dell'implementazione, [[tech-debt]] per il deploy Watchtower ancora da sistemare.

### Polling in background: loop separati per Electron vs Docker
**Contesto:** `pollEmails()` (`src/lib/email-poller.ts`) deve girare periodicamente sia in Electron desktop sia nel container Docker su CasaOS, ma i due ambienti non condividono un modo per schedulare job in background.
**Regola:** Electron usa il proprio loop in `electron/main.cjs` (fetch locale verso `/api/email-poll` ogni 5 min). Il server standalone (Docker) usa `src/instrumentation.ts` (`register()`) per chiamare `pollEmails()` in-process. Il guard `if (process.env.ELECTRON_RUN_AS_NODE) return` in `instrumentation.ts` evita la doppia esecuzione quando Electron lancia il server standalone.
**Perché diverge dalle libs globali:** nessun pattern generico copre "stesso codebase, un target ha un host process che fa polling (Electron) e l'altro è headless (container)".
**Vedi anche:** [[decisions]] per la scelta in-process vs cron sidecar, [[tech-debt]] per il bug che ha fatto scoprire il gap.

### Test unitari con Vitest, co-locati
**Contesto:** Logica pura di `src/lib/` (calcoli, parsing, date).
**Regola:** `npm test` esegue `vitest run`. Test in `src/**/*.test.ts` accanto al file testato, nomi `dovrebbe … se …`, costanti in cima al file. Configurazione in `vitest.config.mts` (alias `@` → `src`, ambiente node). Il file è `.mts` perché il package non è `type: module`.
**Perché diverge dalle libs globali:** Il progetto non aveva test; la regola generica di `testing.md` indica Vitest per Next.js, ma qui è introdotto solo con T-0002.

### Pagine di vista mensile: mese da query validata, oggi in fuso locale
**Contesto:** Qualunque pagina con `?month=YYYY-MM`.
**Regola:** Leggere il mese con `parseMonthParam` (regex `^\d{4}-(0[1-9]|1[0-2])$`, anno 1970-2100), fallback al mese corrente; "oggi" con `todayLocalIso()`. Il calendario non ancora si adegua (vedi tech-debt).
**Perché diverge dalle libs globali:** Regola specifica di TimeSheet, emersa dal confronto tra calendario e riepilogo.

## Vincoli noti

### Questa versione di Next.js usa `proxy.ts`, non `middleware.ts`
**Contesto:** Il progetto è su Next.js 16.2.2, dove il file convention `middleware.ts` è stato rinominato `proxy.ts` (funzione `proxy` invece di `middleware`). Vedi anche l'avviso in `AGENTS.md` sulle breaking change di questa versione rispetto al training data.
**Regola:** Prima di scrivere codice che tocca route protection, rendering statico/dinamico, o altre API Next.js non toccate di recente, controllare `node_modules/next/dist/docs/` (dopo `npm install`) invece di fare affidamento sulla conoscenza pregressa.
**Esempio concreto già incontrato:** i Server Component senza una Request-time API esplicita (es. `prisma.user.count()` da solo, senza `cookies()`/`headers()`) possono essere prerenderizzati staticamente al build in questa versione — serve `await connection()` da `next/server` per forzare la valutazione a request-time (vedi `src/app/login/page.tsx` e `src/app/setup/page.tsx`).