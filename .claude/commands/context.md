# /context — Mostra Contesto Progetto

Carica e mostra il contesto memorizzato del progetto corrente.

## Istruzioni

1. Leggi `@.claude/memory/MEMORY.md` — indice generale
2. Leggi `@.claude/memory/sprint.md` — task e obiettivi correnti
3. Leggi `@.claude/memory/decisions.md` — decisioni architetturali rilevanti
4. Leggi `@.claude/memory/domain.md` — glossario e regole di dominio
5. Leggi `@.claude/memory/conventions.md` — pattern locali del progetto

## Output atteso

Mostra un riepilogo strutturato del contesto del progetto:

---

**📦 Progetto:** [nome dal MEMORY.md]
**Stack:** [tecnologie principali]
**Stato attuale:** [sprint corrente, obiettivo della sessione]

**🎯 Sprint corrente**
[cosa si sta sviluppando, deadline se presente]

**🏗️ Decisioni chiave**
[elenco puntato delle decisioni architetturali più rilevanti]

**📖 Dominio**
[termini chiave, entità principali, regole di business da tenere a mente]

**⚙️ Convenzioni locali**
[pattern specifici di questo progetto che divergono dalle librerie globali]

---

## Regole

- Se un file di memoria non esiste, saltalo senza errori
- Se la memoria è vuota o non inizializzata, suggerisci di eseguire `/remember` per iniziare a popolarla
- Non modificare nulla — solo lettura e visualizzazione
