# Tech Debt

Registro del debito tecnico accumulato durante lo sviluppo.
Ogni item include la priorità, il contesto di origine e il piano di risoluzione.
Aggiornato da `/session-end`.

---

<!-- TEMPLATE PER NUOVO ITEM:

### [Titolo breve — cosa è il debito]
**Priorità:** Alta / Media / Bassa
**Area:** [modulo, layer, o feature coinvolta]
**Data:** YYYY-MM-DD
**Introdotto da:** [commit hash o descrizione della sessione]
**Descrizione:** [cosa è il problema — duplicazione, workaround, astrazione mancante, ecc.]
**Perché rimandato:** [motivo — deadline, dipendenza esterna, complessità]
**Impatto attuale:** [rallenta sviluppo / rischio bug / problema performance / tech risk]
**Risoluzione suggerita:** [come andrebbe affrontato]

-->

## Alta priorità

<!-- Item che bloccano o rallentano significativamente lo sviluppo -->

## Media priorità

<!-- Item che introducono rischio o duplicazione ma non bloccano -->

### Watchtower non attivo sul Pi
**Priorità:** Media
**Area:** Deploy / CasaOS
**Data:** 2026-07-16
**Introdotto da:** scoperto durante il deploy di v1.1.0 (login) — `docker-compose.watchtower.yml` esiste nel repo ma non risulta mai stato deployato sul Pi
**Descrizione:** Nessun processo osserva `ghcr.io/gioixxx/timesheet:latest` per aggiornamenti automatici. Ogni release richiede un `force_update` manuale via MCP `pi-deploy` (o SSH diretto).
**Perché rimandato:** Il flusso manuale con `force_update` funziona come workaround immediato; non blocca i rilasci, solo li rende un passo manuale in più.
**Impatto attuale:** Rischio di dimenticarsi di aggiornare dopo un push — l'app resta silenziosamente ferma alla versione precedente.
**Risoluzione suggerita:** Usare `deploy_app` con `enable_watchtower=true` una volta risolto il problema di permessi qui sotto, oppure configurare Watchtower a mano sul Pi.
**Aggiornamento 2026-09-15 — il rischio si è materializzato.** Al momento del rilascio di
v1.3.0 il container girava ancora sull'immagine del **22 luglio**: le build del 24/07 (`04906d1`) e
del 09/09 (`0704436`) erano su GHCR, verdi, ma **non erano mai state deployate**. Due mesi di lavoro
fermi sul registry senza che nulla lo segnalasse — esattamente lo scenario "l'app resta
silenziosamente ferma alla versione precedente" previsto qui sopra. Il salto è stato recuperato in
un colpo solo con `force_update`. Finché Watchtower non è attivo, **controllare `docker inspect
<app> --format '{{.Created}}'` prima di dare per scontato che il Pi sia allineato a `main`.**


### `deploy_app` fallisce con "Permission denied" su `/DATA/AppData/timesheet`
**Priorità:** Media
**Area:** Deploy / CasaOS (MCP `pi-deploy`)
**Data:** 2026-07-16
**Introdotto da:** riscontrato durante il deploy di v1.1.0 tentando di sincronizzare `docker-compose.yml` aggiornato (aggiunta `AUTH_ENABLED`)
**Descrizione:** Lo strumento MCP `deploy_app`, pensato per sincronizzare `docker-compose*.yml`/`.env*` verso il Pi e avviare i container, fallisce con `[Errno 13] Permission denied` — riproducibile due volte, non risolto rimuovendo `.env` locale dal set di file da sincronizzare, quindi l'errore non dipende dal contenuto locale ma probabilmente da permessi sul lato Pi (proprietario/ACL di `/DATA/AppData/timesheet`, gestito da CasaOS).
**Aggiornamento 2026-07-16:** Riprodotto una terza volta con nessuna modifica a `docker-compose.yml`/`.env` in corso (deploy del fix `instrumentation.ts`, solo codice applicativo) — stesso errore generico `[Errno 13] Permission denied`. Conferma definitivamente che non dipende dal contenuto sincronizzato. Workaround usato con successo: quando il deploy non richiede modifiche a config, saltare `deploy_app` e usare solo `force_update` (build immagine via push su `main` → GH Actions → GHCR).
**Aggiornamento 2026-07-17:** Riprodotto una quarta volta durante il fix del bug cookie `Secure`/HTTP (serviva aggiungere `COOKIE_SECURE: "false"` a `docker-compose.yml`). Workaround usato: modifica manuale del file da parte dell'utente via CasaOS/SSH. Scoperto un gotcha collegato: un semplice **restart** del container (via CasaOS o `docker restart`) **non** rilegge il `docker-compose.yml` aggiornato — le env var restano quelle con cui il container è stato creato l'ultima volta. Serve `docker compose up -d` (che ricrea il container se la config è cambiata) per far sì che le modifiche manuali abbiano davvero effetto. Rilevabile controllando il campo `CREATED`/`Up X` di `docker compose ps` (`app_status` del MCP `pi-deploy`): se non cambia dopo un "restart", la config vecchia è ancora in uso.
**Aggiornamento 2026-09-15 — CAUSA TROVATA.** Ispezionato il Pi via SSH diretto (chiave
`~/.ssh/id_ed25519_pi5_casaos`, host `pi5-casaos` in `~/.ssh/config`): `/DATA/AppData/timesheet`
è `drwxr-xr-x root:root`, mentre l'utente SSH usato da `pi-deploy` è `gioixxx` (uid 1000). Non ha
permesso di scrittura sulla directory, e l'MCP scrive via SFTP **senza** `sudo` — da qui l'
`[Errno 13]`. Non c'entrano né il contenuto sincronizzato né CasaOS. `gioixxx` è nei gruppi `sudo`
(passwordless, verificato) e `docker`, quindi il fix è a portata: `sudo chown -R gioixxx:gioixxx
/DATA/AppData/timesheet`. Non applicato: esula dal rilascio in cui è stato scoperto, e va deciso se
CasaOS si aspetta quei file di root. Nota: l'SSH diretto dalla macchina di sviluppo **funziona**
solo passando la chiave esplicita (`ssh -i ~/.ssh/id_ed25519_pi5_casaos`), l'agent di default no.

**Perché rimandato:** Non ho un accesso a shell generica sul Pi per ispezionare i permessi; serve intervento diretto dell'utente via SSH (`ls -la /DATA/AppData/timesheet`, `whoami`) per capire la causa. Come workaround, la modifica a `docker-compose.yml` è stata applicata a mano dall'utente, poi `force_update`/`docker compose up -d` ha ricreato il container leggendo la config aggiornata.
**Impatto attuale:** Blocca l'uso di `deploy_app` per sincronizzare config future — ogni modifica a `docker-compose.yml`/`.env` sul Pi richiede editing manuale **seguito da una vera ricreazione del container**, non un semplice restart.
**Risoluzione suggerita:** Verificare proprietario/permessi di `/DATA/AppData/timesheet` sul Pi e allinearli all'utente SSH usato da `pi-deploy`.

### Contrasto della voce attiva di CalendarViewSwitch
**Priorità:** Media
**Area:** UI / a11y
**Data:** 2026-11-11
**Introdotto da:** T-0002 (Revisore)
**Descrizione:** `.active` usa testo `#fff` su `--primary`: circa 4,47:1 in dark-midnight (default), sotto 4,5:1 in dark-sunset (~2,1:1), dark-forest (~2,5:1), dark-ocean (~2,8:1). Testo di 0,78rem. Calcolo a mano, non misurato.
**Risoluzione suggerita:** `color: var(--primary-hover); background: var(--primary-glow); border: 1px solid var(--border-focus)`, come `.addLink`; oppure token `--on-primary` per tema (lavoro più ampio).

### Regole mensili duplicate tra calendario e riepilogo
**Priorità:** Media
**Area:** `calendario/page.tsx` (righe 125-168, 181-197), `src/lib/month-summary.ts`, `MonthNav`
**Data:** 2026-11-11
**Introdotto da:** T-0002
**Descrizione:** Stesse regole in due punti, nessun test che leghi calendario e riepilogo; navigazione mese copiata in `MonthNav`.
**Risoluzione suggerita:** Migrare il calendario a `month-summary.ts` e `MonthNav`, con test di parità su un mese reale prima di togliere il codice vecchio.

### calendario/page.tsx non valida ?month e calcola "oggi" in UTC
**Priorità:** Media
**Area:** `src/app/calendario/page.tsx` (`parseInt` su `month`, `getUTC*` righe 93, 169, 177)
**Data:** 2026-11-11
**Introdotto da:** T-0002 (lettura del codice, non provato a runtime sul calendario)
**Descrizione:** `?month=abc` può rompere la pagina; "oggi" in UTC invece del fuso locale della convenzione `dates.ts`.
**Risoluzione suggerita:** Usare `parseMonthParam` e `todayLocalIso()` anche nel calendario, insieme alla migrazione sopra.

### Possibile discrepanza riepilogo/calendario tra 00:00 e 02:00 locali
**Priorità:** Media
**Area:** evidenziazione di "oggi" (calendario UTC, riepilogo `todayLocalIso`)
**Data:** 2026-11-11
**Introdotto da:** T-0002
**Descrizione:** Nelle prime due ore del giorno locale le due schermate possono evidenziare giorni diversi. Non tocca i totali. Il Tester segnala anche che il rischio sta nel chiamante (query Prisma e `todayLocalIso`), non coperto da test.
**Risoluzione suggerita:** Unificare il calcolo di "oggi" con il punto sopra; aggiungere un test di confine sul chiamante.

### Navbar sfora a 390 px (pre-esistente, aggravato dalla pagina nuova)
**Priorità:** Media
**Area:** `src/components/Navbar.module.css` (nessuna media query)
**Data:** 2026-11-11
**Introdotto da:** anteriore a T-0002
**Descrizione:** `scrollWidth` 647 sul riepilogo, 712 su `/calendario`, 575 su `/oggi`: scorrimento orizzontale già oggi. Il riepilogo non aggiunge tab.
**Risoluzione suggerita:** Sotto i 500 px tab a sola icona con `aria-label`, e `flex-wrap` sull'header.

## Bassa priorità

<!-- Miglioramenti non urgenti, pulizia, refactoring cosmetici -->

### Reconcile di claude-libs con `modules: []` non verificato
**Priorità:** Bassa
**Area:** Config / librerie
**Data:** 2026-11-11
**Introdotto da:** T-0001 — rimozione della regione `claude-libs:modules` da `CLAUDE.md` e `modules: []` in `workspace.json`
**Descrizione:** Non è verificato cosa faccia un futuro `reconcile.ps1` di claude-libs con `modules: []`: potrebbe reinserire la regione o `@.claude/libs/CLAUDE.md`. Non è verificato nemmeno se altri script leggono `modules` da `workspace.json`.
**Perché rimandato:** Il problema emerge solo al prossimo reconcile; non blocca il lavoro corrente.
**Impatto attuale:** Rischio di tornare ai doppioni (costo a ogni turno) e di memoria claude-libs in contesto.
**Risoluzione suggerita:** Al prossimo reconcile controllare che `CLAUDE.md` contenga solo `@AGENTS.md` e la regione consoleclaude; controllare gli script che leggono `workspace.json`.

### Ferie: card Assenze e ore attese usano metriche diverse
**Priorità:** Bassa
**Area:** `src/app/calendario/riepilogo/page.tsx` (righe 70, 93, 124)
**Data:** 2026-11-11
**Introdotto da:** T-0002 (Revisore, 💡)
**Descrizione:** "Ferie" nella card Assenze usa `byType.FERIE` (tutte le ferie, anche weekend o oltre 8h); "attese − Xgg ferie" usa `ferieDays` (solo feriali, max 8h). Con dati normali coincidono.
**Risoluzione suggerita:** Mostrare `ferieDays` nella card, oppure documentare la differenza.

### Duplicati di formatDuration e nomi di mesi in 7 file
**Priorità:** Bassa
**Area:** `calendario/page.tsx`, `[date]/page.tsx`, `oggi/page.tsx`, `Navbar.tsx`, `SearchBar.tsx`, `TimeEntryList.tsx`, `export-xlsx.ts`
**Data:** 2026-11-11
**Introdotto da:** anteriore a T-0002; il codice nuovo usa `src/lib/format-duration.ts`
**Risoluzione suggerita:** Unificare in un task di pulizia, dopo i test di parità.

### Lint con 3 errori e 2 warning pre-esistenti
**Priorità:** Bassa
**Area:** `cache-audit.js` (no-require-imports ×3), `EditButton.tsx` e `TimeEntryForm.tsx` (react-hooks/incompatible-library)
**Data:** 2026-11-11
**Introdotto da:** anteriore a T-0002
**Risoluzione suggerita:** Sistemare in un task dedicato.

### Vitest ^4 perché Vitest 5 conflitta con @types/node ^20
**Priorità:** Bassa
**Area:** `package.json` (devDependencies)
**Data:** 2026-11-11
**Introdotto da:** T-0002
**Descrizione:** Vitest 5 richiede `@types/node ^22 || >=24`; il progetto è su `^20`, quindi `npm install` fallisce con ERESOLVE.
**Risoluzione suggerita:** Alzare `@types/node` quando si fa l'upgrade Node, poi passare a Vitest 5.

### Ore di "Aggiungi voce" nel mese vuoto puntano a /oggi senza data
**Priorità:** Bassa
**Area:** `src/app/calendario/riepilogo/page.tsx` (riga 166)
**Data:** 2026-11-11
**Introdotto da:** T-0002 (Revisore, 💡)
**Risoluzione suggerita:** `/oggi?date=<primo giorno lavorativo del mese>`, oppure lasciare così per scelta.

### Minori del Revisore (UI e query)
**Priorità:** Bassa
**Area:** `riepilogo/page.tsx` (riga 108, aria-valuetext mancante sopra il 100%; riga 55, include client/project/tags non ristretto con select); `MonthSummaryDay.tsx` (righe 147-151, link "Aggiungi" senza contesto srOnly)
**Data:** 2026-11-11
**Introdotto da:** T-0002
**Risoluzione suggerita:** Aggiungere `aria-valuetext`, restringere la query, aggiungere srOnly con la data.

---

## Archiviato

<!-- Item risolti — non eliminare, servono come storico -->

### Esempio (da rimuovere quando si popola)
**Priorità:** Bassa
**Area:** Struttura Iniziale
**Data:** 2026-04-19
**Introdotto da:** Inizio progetto
**Descrizione:** La struttura iniziale del progetto è generica e necessita di essere raffinata per allinearsi alle best practice di Next.js specifiche del dominio TimeSheet.
**Perché rimandato:** Priorità all'implementazione delle funzionalità core.
**Impatto attuale:** Nessun impatto immediato, ma potenziale per refactoring futuro.
**Risoluzione suggerita:** Rivedere e standardizzare la struttura delle cartelle e dei componenti React dopo le prime user stories.