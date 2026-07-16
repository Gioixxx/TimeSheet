# Memoria Progetto — TimeSheet

> Indice del contesto persistente. Aggiornato automaticamente da `/remember`.
> Caricato da Claude ad ogni sessione via `@.claude/memory/MEMORY.md` nel CLAUDE.md del progetto.

## Panoramica

**Stack:** nextjs
**Repo:** F:/Root Progetti/PROJECTS/TimeSheet
**Team:** [chi lavora al progetto]
**Ultimo aggiornamento:** 2026-07-16

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