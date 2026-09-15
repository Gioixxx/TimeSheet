# Sprint Corrente

Stato del lavoro in corso. Aggiornato con `/sprint`.

---

## Sprint attivo

**Nome/Numero:** Hardening deploy CasaOS
**Inizio:** 2026-07-16
**Fine prevista:** [data]
**Obiettivo:** Consolidare l'infrastruttura di deploy sul Pi/CasaOS dopo il rilascio del login (v1.1.0): auto-update affidabile e sync della configurazione senza intervento manuale.

### In corso

- [ ] Watchtower non è mai stato attivo sul Pi — i deploy vanno spinti a mano con `force_update` finché non si configura
- [ ] `deploy_app` "Permission denied" su `/DATA/AppData/timesheet` — **causa trovata il 2026-09-15** (dir `root:root`, utente SSH `gioixxx` uid 1000, SFTP senza sudo). Fix noto e a un comando: `sudo chown -R gioixxx:gioixxx /DATA/AppData/timesheet`. Non applicato, vedi [[tech-debt]]
- [ ] Verificare se iAPi funziona per il parsing NL nel form (`TimeEntryForm`, sostituito a Gemini) — in attesa che l'utente testi manualmente e riporti l'esito

### Completati

- [x] **Rilascio v1.3.0 sul Pi (2026-09-15)** — merge del branch `claude/project-analysis-bug-check-br8h08`
      su `main`, tag `v1.3.0`, build ARM64 verde, `force_update`. Verificato: container ricreato
      (nuovo `ENTRYPOINT`), `No pending migrations to apply`, healthcheck `healthy`, processo non
      più root (uid 1000), `/data` passato a `node:node`, `TZ` = CEST, `/` → 307 → `/login`
- [x] Migliorato l'export: aggiunto formato Excel (.xlsx) formattato accanto al CSV, filtri UI rispettati, riga totale generale (v1.2.0)
- [x] Login per l'istanza web esposta su CasaOS (v1.1.0) — vedi [[decisions]]
- [x] Verificato in produzione: setup account, login, redirect corretti
- [x] Diagnosticato e risolto: email mai recuperata su Docker/CasaOS (nessun trigger per `/api/email-poll` nel container) — aggiunto `src/instrumentation.ts`, deployato, verificato funzionante
- [x] Sostituito Gemini con iAPi e arricchiti i task da email
- [x] Schedulato il polling IMAP in-process nel server standalone
- [x] Aggiornata la memoria del progetto (fix polling email Docker)
- [x] Implementata la funzionalità di reminder con notifiche e miglioramenti UI
- [x] Aggiunta la funzionalità di export CSV con ordinamento e calcoli riassuntivi
- [x] Aggiunte icone e label per il tipo di attività STRAORDINARIO nei componenti SearchBar e TimeEntryList
- [x] Aggiunta la funzionalità di notifica audio alle alert Reminder
- [x] Aggiunto il tipo di attività STRAORDINARIO e relative calcolazioni
- [x] Aggiornata la schema Prisma e aggiunta migration Reminder
- [x] Aggiornata la schema Prisma con binary targets per la generazione del client
- [x] Rende configurabile il flag Secure del cookie di sessione
- [x] Impedisce al service worker di cachare pagine di login
- [x] Aggiornata la memoria del progetto (fix login Calendario/Oggi)
- [x] Aggiunta la funzionalità di login per l'istanza esposta su internet
- [x] Risolti i 20 bug dell'audit statico
- [x] Spostati gli hook claude-libs fuori da settings.json versionato
- [x] Non versionato .claude/settings.local.json
- [x] Audit statico dei bug del progetto
- [x] Riepilogo export diviso anche per tipo attività (#3)
- [x] Aggiunto export Excel (.xlsx) con filtri UI e totale generale
- [x] Debrief sessione — backlog TLS e aggiornamento data memoria
- [x] Aggiornata memoria progetto (fix login Calendario/Oggi)
- [x] Aggiornata memoria progetto (fix polling email Docker)
- [x] Schedulato il polling IMAP in-process nel server standalone
- [x] Aggiornata sprint e ignorati i backup automatici (*.bak)
- [x] Release 1.1.0
- [x] Aggiunto login per l'istanza esposta su internet
- [x] Aggiornata sprint corrente
- [x] Registrazione progetto e aggiornamento a 1.27.0
- [x] Allineato il pannello attività al form di inserimento manuale

### Bloccati / In attesa

_Nessun blocco al momento._

---

## Storico sprint

### Sprint di Avvio / "Registrazione Tempo Base" (2026-04-19 → 2026-07-16)
- **Obiettivo:** consegnare le funzionalità di base per la registrazione delle schede attività (US-001, US-002)
- **Esito:** completato — applicazione stabile e funzionante

### Stabilizzazione / Migliorie post-avvio (2026-07-16)
- **Obiettivo:** migliorie e verifiche successive alla stabilizzazione iniziale
- **Esito:** completato — ha prodotto la feature di login (v1.1.0) per l'esposizione su internet dell'istanza CasaOS
