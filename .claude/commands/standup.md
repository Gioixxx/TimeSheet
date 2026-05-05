# /standup — Daily Standup

Genera il riepilogo per il daily standup partendo da git log e dalla memoria del progetto.

## Istruzioni

1. Esegui `git log --oneline --since="yesterday" --author="$(git config user.name)"` per vedere i commit di ieri
2. Esegui `git log --oneline --since="today" --author="$(git config user.name)"` per vedere i commit di oggi
3. Leggi `@.claude/memory/sprint.md` per i task in corso e bloccati
4. Esegui `git status` per verificare lavoro non committato in corso

## Output atteso

Mostra il formato standup pronto da leggere o incollare:

---

**Standup [data oggi]**

**Ieri**
[lista puntata di cosa è stato fatto — basata sui commit e sui task marcati completati. Se non ci sono commit, indica "nessun commit — lavoro in corso su: [task aperti]"]

**Oggi**
[lista puntata dei task aperti dallo sprint attuale, ordinati per priorità]

**Blocchi**
[lista puntata dei task bloccati da sprint.md. Se nessuno: "nessun blocco"]

---

## Regole

- Traduci i commit in linguaggio naturale — non ripetere i messaggi git letteralmente
- Se non ci sono commit ieri, inferisci dall'ultimo stato sprint cosa era in corso
- Includi solo i task realisticamente affrontabili oggi (max 3)
- Se ci sono modifiche non committate, menzionale sotto "Oggi" come lavoro in corso
- Non modificare nessun file — solo lettura e output
