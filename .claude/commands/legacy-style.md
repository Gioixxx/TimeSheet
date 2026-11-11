---
description: "Convenzioni implicite del codice in conventions.md"
argument-hint: [cartella]
disable-model-invocation: true
---
# /legacy-style — Convenzioni implicite del codice

Per un repository esistente: scopre le convenzioni che il codice segue senza dirle e, con la conferma dell'utente, le scrive in `.claude/memory/conventions.md`.

## Input
Un campione del codice, per ogni linguaggio presente: i file più recenti e più toccati (`git log --name-only`), nella cartella indicata o nell'intero progetto. `.claude/memory/conventions.md` (letto con Read, non importato).

## Passi
1. **Rileva** le convenzioni implicite: nomi, struttura delle cartelle, gestione degli errori, import, test, formato dei commit. Per ognuna annota la frequenza osservata («in 9 file su 11»)
2. **Elenca i conflitti**: due stili nello stesso repository (per esempio `camelCase` e `snake_case` nei nomi dei file). Risolvili **con l'utente, uno alla volta**: con AskUserQuestion, 2-4 opzioni, raccomandando quella più frequente. Se AskUserQuestion non c'è, una domanda per messaggio
3. **Mostra** il testo da aggiungere a `conventions.md` e scrivi **solo dopo la conferma**, in fondo al file e senza cancellare ciò che c'è

## Regole
- Non tocca il codice: scrive solo in `.claude/memory/conventions.md`
- Una convenzione si scrive solo se la vedi in almeno tre file
- Al massimo 15 voci per giro
- Una convenzione già in `conventions.md` non si ripete
- Prima della conferma non scrivere nulla

## Output
Voci rilevate con frequenza, conflitti risolti (la scelta dell'utente), testo scritto e percorso del file
