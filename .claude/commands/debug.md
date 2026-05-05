# /debug — Protocollo Debug

Avvia il protocollo di debug strutturato per un errore o comportamento anomalo.

## Istruzioni

Chiedi all'utente (se non lo ha già fornito):
- L'errore esatto o il comportamento inatteso
- Dove si verifica (file, funzione, endpoint)
- Come riprodurlo

**MCP disponibili:** se l'errore è uno stack trace sconosciuto o un messaggio di errore specifico di una libreria, usa Brave Search per cercarlo online prima di procedere per tentativi:

```text
search the web for "[messaggio errore esatto] [libreria] [versione]"
```

Se l'errore riguarda un'API deprecata o un metodo mancante, usa Context7:

```text
use context7 to get the latest docs for [libreria]
```

Poi segui il protocollo in 6 step:

## Step 1 — Riproduzione

Identifica la condizione minima che causa il problema:
- Input specifico che lo scatena
- Stato del sistema necessario
- Se è deterministico o intermittente

## Step 2 — Stack Trace

Analizza lo stack trace (se presente):
- Tipo di eccezione
- Prima riga di codice custom nello stack (ignora librerie)
- Punto di ingresso più probabile

## Step 3 — Ipotesi

Formula 2-3 ipotesi ordinate per probabilità:

```
1. [90%] Causa più probabile — spiegazione in una riga
2. [8%]  Causa alternativa — spiegazione in una riga  
3. [2%]  Causa rara — spiegazione in una riga
```

## Step 4 — Verifica

Per ogni ipotesi, indica come verificarla:
- Cosa aggiungere al log
- Quale valore controllare a debug
- Quale test scrivere per isolare il problema

## Step 5 — Fix

Applica il fix per l'ipotesi più probabile:
- Fix minimale — no refactoring, no miglioramenti, solo la correzione
- Mostra il diff: codice prima → codice dopo
- Spiega perché questo fix risolve il problema

## Step 6 — Prevenzione

Suggerisci come evitare lo stesso problema in futuro:
- Test da aggiungere
- Validazione da anticipare
- Pattern da adottare

## Regole

- Se il primo fix non risolve, torna al Step 3 con l'ipotesi successiva
- Max 2 tentativi prima di chiedere più informazioni all'utente
- Non modificare codice non correlato al bug durante il debug
