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

### `deploy_app` fallisce con "Permission denied" su `/DATA/AppData/timesheet`
**Priorità:** Media
**Area:** Deploy / CasaOS (MCP `pi-deploy`)
**Data:** 2026-07-16
**Introdotto da:** riscontrato durante il deploy di v1.1.0 tentando di sincronizzare `docker-compose.yml` aggiornato (aggiunta `AUTH_ENABLED`)
**Descrizione:** Lo strumento MCP `deploy_app`, pensato per sincronizzare `docker-compose*.yml`/`.env*` verso il Pi e avviare i container, fallisce con `[Errno 13] Permission denied` — riproducibile due volte, non risolto rimuovendo `.env` locale dal set di file da sincronizzare, quindi l'errore non dipende dal contenuto locale ma probabilmente da permessi sul lato Pi (proprietario/ACL di `/DATA/AppData/timesheet`, gestito da CasaOS).
**Aggiornamento 2026-07-16:** Riprodotto una terza volta con nessuna modifica a `docker-compose.yml`/`.env` in corso (deploy del fix `instrumentation.ts`, solo codice applicativo) — stesso errore generico `[Errno 13] Permission denied`. Conferma definitivamente che non dipende dal contenuto sincronizzato. Workaround usato con successo: quando il deploy non richiede modifiche a config, saltare `deploy_app` e usare solo `force_update` (build immagine via push su `main` → GH Actions → GHCR).
**Perché rimandato:** Non ho un accesso a shell generica sul Pi per ispezionare i permessi; serve intervento diretto dell'utente via SSH (`ls -la /DATA/AppData/timesheet`, `whoami`) per capire la causa. Come workaround, la modifica a `docker-compose.yml` è stata applicata a mano dall'utente, poi `force_update` ha ricreato il container leggendo la config aggiornata.
**Impatto attuale:** Blocca l'uso di `deploy_app` per sincronizzare config future — ogni modifica a `docker-compose.yml`/`.env` sul Pi richiede editing manuale.
**Risoluzione suggerita:** Verificare proprietario/permessi di `/DATA/AppData/timesheet` sul Pi e allinearli all'utente SSH usato da `pi-deploy`.

## Bassa priorità

<!-- Miglioramenti non urgenti, pulizia, refactoring cosmetici -->

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