# /session-start — Briefing Sessione

Carica il contesto del progetto e mostra tutto quello che serve per iniziare a lavorare.

## Istruzioni

1. Leggi `@.claude/memory/MEMORY.md`
2. Leggi `@.claude/memory/sprint.md`
3. Leggi `@.claude/memory/decisions.md`
4. Leggi `@.claude/memory/tech-debt.md` (se esiste)
5. Esegui `git log --oneline -10` per vedere i commit recenti
6. Esegui `git status` per vedere modifiche non committate
7. Esegui `git diff --stat` per vedere i file modificati

## Output atteso

Mostra il briefing strutturato della sessione:

---

**Progetto:** [nome dal MEMORY.md]
**Data:** [oggi]

**Ultimo lavoro**
[ultimi 5 commit in linguaggio naturale — cosa è stato fatto]

**Stato working tree**
[branch corrente, file modificati non committati se presenti, altrimenti "working tree pulito"]

**Sprint: [nome] — scade [data]**
In corso: X task aperti
[lista dei task aperti — solo quelli senza [x]]
Bloccati: [lista task bloccati se presenti, altrimenti nessuno]

**Tech debt aperta**
[items ad Alta priorità da tech-debt.md, se esistono — altrimenti "nessun debito tecnico urgente"]

**Da dove ripartire**
[1-2 frasi su quale task sembra il più logico da riprendere, basandosi sul git log e sullo stato sprint]

---

## Regole

- Se un file di memoria non esiste, saltalo senza errori
- Se la memoria non è inizializzata, avvisa l'utente e suggerisci di eseguire `/remember`
- Non modificare nulla — solo lettura e visualizzazione
- Se il working tree ha modifiche non committate, evidenziale con un avviso visibile
- Sintetizza — il briefing deve essere leggibile in 30 secondi
