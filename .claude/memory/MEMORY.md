# Memoria Progetto — TimeSheet

> Indice del contesto persistente. Aggiornato automaticamente da `/remember`.
> Caricato da Claude ad ogni sessione via `@.claude/memory/MEMORY.md` nel CLAUDE.md del progetto.

## Panoramica

**Stack:** nextjs
**Repo:** F:/Root Progetti/PROJECTS/TimeSheet
**Team:** [chi lavora al progetto]
**Ultimo aggiornamento:** 2026-09-24

## Contesto rapido

> 2-3 righe su cos'è il progetto e qual è l'obiettivo attuale. Aggiorna questa sezione ogni sprint.

TimeSheet è un'applicazione per la gestione delle schede attività, focalizzata sulla registrazione del tempo lavorato per specifici progetti e attività. L'obiettivo attuale è implementare le funzionalità di base per la registrazione del tempo in linea con le user stories del backlog (US-001, US-002).

## Indice memoria

- [Decisioni architetturali](decisions.md) — scelte tecniche con motivazioni
- [Dominio e glossario](domain.md) — entità, termini, regole di business
- [Sprint corrente](sprint.md) — task in corso e obiettivi
- [Convenzioni locali](conventions.md) — pattern specifici del progetto
- [Tech debt](tech-debt.md) — debito tecnico con priorità e contesto
- [Backlog](backlog.md) — funzionalità e idee a lungo termine
- [ADR](adr.md) — Architecture Decision Records formali

## Segnalibri critici

> Cose da tenere sempre a mente durante il lavoro. Aggiorna con `/remember`.

- Le user stories US-001 e US-002 sono le priorità immediate per l'implementazione della registrazione del tempo.
- L'app gira sia come Electron desktop locale (mai esposto) sia come Docker su CasaOS/Pi dell'utente (esposto su internet). Il login (vedi [[decisions]]) è gated dal flag `AUTH_ENABLED`: assente/false per Electron e dev locale, `"true"` solo in `docker-compose.yml`. Non dare per scontato che l'auth sia sempre attiva quando si modifica codice in quest'area.
- L'istanza Docker/CasaOS è su **`https://myservergio.duckdns.org:3000`**: Caddy (`timesheet-caddy`) tiene la porta 3000 con certificato Let's Encrypt via DNS-01 DuckDNS (`DUCKDNS_TOKEN` nel `.env` del Pi) e inoltra a `timesheet:3000`, non più pubblicato sull'host. `COOKIE_SECURE` non è più impostato (cookie `Secure`). HTTPS serve anche al microfono del form. Il compose del Pi va **modificato, non sostituito** con quello del repo (default `IAPI_BASE_URL` diverso) — vedi [[decisions]].
- **SSH diretto al Pi funziona** e spesso è più veloce dell'MCP `pi-deploy` per diagnosticare:
  `ssh -i ~/.ssh/id_ed25519_pi5_casaos gioixxx@192.168.1.50` (alias `pi5-casaos` in `~/.ssh/config`).
  La chiave va passata **esplicita**: l'agent di default non ce l'ha e si becca `Permission denied`.
  `sudo` è passwordless. Da qui si leggono ownership, digest immagine, `docker top`, healthcheck —
  tutto ciò che i 7 tool dell'MCP non espongono.
- **Prima di un deploy, verifica da quanto è ferma l'immagine**: `docker inspect timesheet
  --format '{{.Created}}'`. Senza Watchtower le build verdi su GHCR **non** arrivano da sole sul Pi —
  a settembre 2026 il container aveva due mesi di ritardo su `main` (vedi [[tech-debt]]).
- Il backup pre-rilascio vive in `~/timesheet-backups/<timestamp>/` sul Pi: `docker cp timesheet:/data`
  (DB **e** `.auth-secret` — senza quest'ultimo tutte le sessioni decadono) più i file di config via
  `sudo`, e il digest dell'immagine per il rollback.
- Su CasaOS/Pi, un semplice **restart** del container non rilegge `docker-compose.yml` — serve `docker compose up -d` per far applicare modifiche alle env var (vedi [[tech-debt]]). `deploy_app` del MCP `pi-deploy` fallisce per permessi su `/DATA/AppData/timesheet`, quindi le modifiche a compose/env vanno fatte a mano dall'utente.
- Quando non si è sulla stessa rete wifi del Pi, usare il server MCP `mcp__pi-deploy-remote__*` (IP pubblico + port-forward, porta 8888) invece di `mcp__pi-deploy__*` (default, IP LAN) — vedi [[decisions]]. Config in `~/.claude.json`, fuori dal repo; richiede riavvio sessione dopo modifiche.