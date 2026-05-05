# /session-end — Debrief Sessione

Chiudi la sessione di lavoro: riepiloga cosa è stato fatto, aggiorna la memoria e individua il debito tecnico emerso.

## Istruzioni

1. Esegui `git log --oneline --since="today"` per vedere i commit della sessione
2. Esegui `git diff --stat HEAD~5 HEAD` per vedere cosa è cambiato di recente
3. Leggi `@.claude/memory/sprint.md`
4. Leggi `@.claude/memory/conventions.md`
5. Leggi `@.claude/memory/tech-debt.md` (se esiste)
6. Chiedi all'utente: "Cosa hai fatto in questa sessione? Cosa è rimasto in sospeso?"

## Analisi post-sessione

Basandoti sulla risposta dell'utente e sui dati git:

**a) Task completati**
Identifica quali task dello sprint sono stati completati in questa sessione (confronta git log con la lista "In corso" di sprint.md).

**b) Nuovi pattern o convenzioni scoperti**
Se nel codice compaiono pattern non presenti in `conventions.md`, proponili come nuove convenzioni.

**c) Debito tecnico emerso**
Identifica workaround, TODO lasciati nel codice, o compromessi fatti per necessità. Ogni item è un candidato per `tech-debt.md`.

**d) Blocchi o dipendenze esterne**
Individua se qualche task è bloccato da una dipendenza esterna o da una decisione da prendere.

## Output — proposta aggiornamenti

Mostra il riepilogo e la proposta di aggiornamenti prima di scrivere:

---

**Sessione del [data]**

Completati oggi:
- [task 1]
- [task 2]

In sospeso per la prossima sessione:
- [cosa rimane]

**Aggiornamenti proposti a sprint.md:**
[mostra esattamente le righe da spostare da "In corso" a "Completati"]

**Nuovi item per tech-debt.md (se presenti):**
[mostra ogni item nel formato template]

**Nuove convenzioni da aggiungere (se presenti):**
[mostra ogni convenzione nel formato template]

---

Vuoi che applichi questi aggiornamenti? (sì / modifica X / salta)

## Comportamento dopo conferma

- **sì**: applica tutti gli aggiornamenti proposti
- **modifica [X]**: modifica solo quell'item e chiedi di nuovo conferma
- **salta**: non scrivere nulla

## Regole

- Non scrivere mai senza conferma esplicita dell'utente
- Non duplicare informazioni già presenti nei file
- Se `tech-debt.md` non esiste ancora, crealo con l'intestazione del template prima di aggiungere il primo item
- Dopo aver scritto, segnala se qualcosa merita `/remember` (decisioni architetturali, regole di dominio)
- Non creare un nuovo sprint automaticamente — se lo sprint è completato, avvisa e suggerisci `/sprint`
- Aggiorna sempre "Ultimo aggiornamento" nei file modificati
