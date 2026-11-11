---
name: precise-code
description: Writes complete, production-ready code that matches local style. Use when creating or editing source files, implementing a feature, fixing a bug, or refactoring — before writing any code.
---
# Precise code

Protocollo di scrittura indipendente dallo stack. Non sostituisce i moduli `.claude/consoleclaude/stacks/` — li applica.

## Prima di scrivere

1. Leggi 1–2 file nella stessa cartella (e il modulo/classe gemello se esiste) e replica naming, import, error handling, test style.
2. Se il progetto ha `.claude/consoleclaude/manifest.json`, leggi `stacks` (se c'è, gli stack sono più di uno) o `stack` e carica la skill `write-<stack>` dello stack del codice che tocchi, se esiste.
3. Per modifiche non banali, scrivi un piano breve (passi, file toccati, rischio) **prima** del codice.

## Mentre scrivi

- Codice completo e compilabile: niente `TODO`, placeholder, blocchi commentati, `...`, `pass`/`NotImplemented` lasciati come lavoro futuro.
- DRY rispetto al codice già nel repo: riusa helper, tipi, convenzioni esistenti.
- Stesso linguaggio del file circostante (async, naming, layer). Non introdurre una libreria nuova senza che sia già nel progetto o richiesta.
- Validazione in ingresso e errori espliciti; niente swallow silenzioso.
- Test o aggiornamento test se il progetto li ha e la modifica è comportamentale.

## Dopo

- Rileggi il diff: ogni file nuovo deve stare nel layer/cartella giusti.
- Verifica le sezioni **Obbligatorie** del modulo stack caricato (o della skill `write-<stack>`).
- Non duplicare regole stack in questo file: la fonte è `.claude/consoleclaude/stacks/<stack>.md` (se presente).
