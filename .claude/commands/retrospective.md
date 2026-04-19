# /retrospective — Retrospettiva Sprint

Chiudi lo sprint corrente con una retrospettiva strutturata e prepara il terreno per il prossimo.

## Istruzioni

1. Leggi `@.claude/memory/sprint.md` per vedere lo sprint corrente (task completati, bloccati, obiettivo)
2. Leggi `@.claude/memory/tech-debt.md` per vedere il debito tecnico accumulato
3. Leggi `@.claude/memory/conventions.md` per vedere le convenzioni emerse
4. Esegui `git log --oneline` per gli ultimi 20 commit dello sprint
5. Chiedi all'utente: "Cosa ha funzionato bene in questo sprint? Cosa non ha funzionato? Cosa cambieresti?"

## Analisi retrospettiva

Basandoti sui dati raccolti e sulla risposta dell'utente:

**a) Velocità effettiva**
Confronta task pianificati vs completati. Calcola la percentuale di completamento.

**b) Debito tecnico generato**
Quanti item sono stati aggiunti a tech-debt.md durante questo sprint? Sono stati risolti item precedenti?

**c) Pattern emergenti**
Ci sono stati blocchi ricorrenti? Dipendenze esterne che hanno rallentato? Aree del codice che hanno richiesto più tempo del previsto?

**d) Convenzioni stabilite**
Nuove convenzioni emerse che andrebbero formalizzate in conventions.md?

## Output — proposta retrospettiva

---

**Retrospettiva Sprint [nome]**
**Periodo:** [data inizio] → [data fine]
**Completamento:** X/Y task (Z%)

**Cosa ha funzionato**
- [punto 1]
- [punto 2]

**Cosa non ha funzionato**
- [punto 1]
- [punto 2]

**Action items per il prossimo sprint**
- [ ] [azione concreta 1]
- [ ] [azione concreta 2]

**Proposta aggiornamenti:**

*sprint.md* — archivia sprint corrente e crea intestazione nuovo sprint
*tech-debt.md* — aggiorna priorità in base a quanto emerso
*conventions.md* — aggiungi [N] nuove convenzioni emerse

---

Vuoi che applichi gli aggiornamenti e crei il nuovo sprint? (sì / modifica X / salta)

## Comportamento dopo conferma

- **sì**: archivia lo sprint corrente in sprint.md, crea la sezione del nuovo sprint vuota, aggiorna tech-debt e conventions
- **modifica [X]**: modifica solo quell'elemento e chiedi di nuovo
- **salta**: non scrivere nulla

## Regole

- Non cancellare mai i task completati — spostali nella sezione "Archiviato" di sprint.md
- Il nuovo sprint deve avere obiettivo e date — chiedi all'utente se non li conosce
- Se ci sono action items tecnici (es. "refactorare il modulo X"), aggiungili direttamente al backlog.md
- Segnala se qualche decisione architettuale emersa merita `/remember`
- Non modificare mai adr.md in automatico — le ADR richiedono riflessione deliberata
