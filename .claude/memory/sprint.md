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
- [ ] Diagnosticare il "Permission denied" di `deploy_app` verso `/DATA/AppData/timesheet` (impedisce il sync automatico di `docker-compose.yml`/`.env`)
- [ ] Verificare se iAPi funziona per il parsing NL nel form (`TimeEntryForm`, sostituito a Gemini) — in attesa che l'utente testi manualmente e riporti l'esito

### Completati

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
