# /doc-update — Sincronizza Documentazione Esistente

Analizza cosa è cambiato nel progetto (git diff + memoria sprint) e identifica documentazione esistente diventata stale o mancante. Produce un report con azioni concrete — non modifica file direttamente.

**Differenza da `/session-end`**: aggiorna la *documentazione tecnica del prodotto* (README, API docs, docstring). `/session-end` aggiorna la *memoria interna del processo* (sprint.md, tech-debt.md, conventions.md). I due si complementano.

## Istruzioni

1. Chiedi all'utente l'intervallo di analisi:
   - **Ultima sessione** — cambiamenti di oggi
   - **Sprint corrente** — cambiamenti dall'inizio dello sprint
   - **Intervallo custom** — due commit o date specifiche

2. In base alla risposta, esegui il comando git appropriato per elencare i file modificati:
   - Ultima sessione: `git log --oneline --since="today" --name-only`
   - Sprint: leggi la data di inizio da `@.claude/memory/sprint.md`, poi `git log --oneline --since="[data]" --name-only`
   - Intervallo custom: `git diff [ref-a]..[ref-b] --name-only`

3. Leggi `@.claude/memory/sprint.md` per la lista dei task completati e feature aggiunte

4. Leggi `@.claude/memory/decisions.md` per decisioni prese di recente che potrebbero richiedere aggiornamento ADR o commenti nel codice

5. Per ogni file di codice modificato:
   - Cerca file di documentazione correlati nella stessa cartella (README.md, file `*.md`, commenti di modulo)
   - Verifica se la doc inline (docstring/commenti) è ancora coerente con la firma corrente
   - Controlla se il file fa parte di un'interfaccia pubblica senza doc aggiornata

6. Compila il report di sincronizzazione (vedi sezione Output)

## Stale detection — cosa cercare

| Evento rilevato | Tipo di problema |
|----------------|-----------------|
| Cambio firma metodo/endpoint pubblico | API docs o docstring stale |
| Nuovo metodo/funzione pubblica senza doc | Gap di copertura |
| Feature nello sprint senza aggiornamento README | Sezione README mancante |
| File rinominato o spostato | Link o riferimenti rotti nella doc |
| Decisione in `decisions.md` non riflessa nel codice | Inconsistenza doc/codice |
| Parametro aggiunto/rimosso da un endpoint | Tabella parametri stale |

**Non segnalare come stale:**
- File di test (`.test.ts`, `_test.py`, `*.spec.*`)
- File di configurazione minori (`.env.example`, linting, formatter)
- Migrazioni di database
- File generati automaticamente

## Output — report di sincronizzazione

```
## Report Doc-Update
Intervallo analizzato: [da] → [a]
File modificati: [N]

### Doc da aggiornare (esiste ma è stale)
- `[path/file.md]` §"[Sezione]" — [motivo: es. firma di POST /users cambiata, nuovo parametro `role`]
- `[path/altro.ts]` docstring `[nomeMetodo]` — [motivo: parametro rimosso]

### Doc mancante (codice nuovo senza doc)
- `[path/service.ts]` metodo `[nomeMetodo]` — interfaccia pubblica usata in [N] punti, nessuna docstring
- `[path/endpoint.ts]` — nuovo endpoint POST /[path] senza API doc

### Doc OK — nessuna azione necessaria
- [elenco file verificati e trovati aggiornati, oppure "Nessun file di doc trovato correlato"]

### Azioni suggerite
1. Esegui `/doc` su `[path/service.ts]` → `[nomeMetodo]` per aggiungere la docstring
2. Aggiorna `README.md` §"[Sezione]" con le nuove firme — usa `/doc` sul codice corrente
3. Aggiungi a `tech-debt.md`: doc mancante su `[componente]` (bassa priorità)
```

## Integrazione con altri agenti

- **`/doc`** — agente da invocare per risolvere i gap trovati da questo report
- **`/session-end`** — chiamare prima per aggiornare la memoria interna; poi questo agente per la doc tecnica
- **`/retrospective`** — chiamare dopo: i gap di doc non risolti diventano tech debt dello sprint
- **`/changelog`** — complementare: questo agente trova cosa aggiornare internamente, `/changelog` genera le note per gli utenti finali
- **`/remember`** — per aggiungere a `tech-debt.md` i gap che non si risolvono subito

## Regole

- Non modificare nessun file — output solo come report e lista azioni
- Non generare documentazione direttamente — delegare sempre a `/doc`
- Se i file modificati nell'intervallo sono più di 20, chiedere di circoscrivere: "Ci sono molti file cambiati — vuoi analizzare solo una cartella specifica o un sottoinsieme?"
- Se `git log` non restituisce cambiamenti, segnalarlo: "Nessuna modifica trovata nell'intervallo specificato"
- Distinguere chiaramente tra "stale" (doc esiste ma è sbagliata) e "mancante" (doc non esiste) — richiedono azioni diverse
- Non segnalare come problema la mancanza di doc su codice privato/interno semplice — solo su interfacce pubbliche
