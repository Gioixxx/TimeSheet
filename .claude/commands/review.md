# /review — Code Review

Esegui una code review del codice selezionato o del file corrente.

## Istruzioni

1. Leggi il codice selezionato o, se non c'è selezione, il file aperto nel contesto
2. Carica le convenzioni del progetto da `@.claude/memory/conventions.md` se esiste
3. Analizza rispetto a:
   - Convenzioni architetturali (Clean Architecture, separazione responsabilità)
   - Sicurezza (injection, esposizione dati sensibili, validazione input)
   - Performance (query N+1, operazioni costose in loop, memory leak)
   - Leggibilità (nomi chiari, metodi troppo lunghi, complessità ciclomatica)
   - Copertura errori (edge case non gestiti, eccezioni silenziose)

## Output atteso

Struttura la risposta così:

**✅ Cosa va bene** — elenca i punti positivi (sii specifico, non generico)

**⚠️ Miglioramenti** — per ogni punto: descrivi il problema, mostra il codice attuale e la versione migliorata

**❌ Problemi bloccanti** — bug, vulnerabilità o violazioni architetturali gravi con fix obbligatorio

**💡 Suggerimento opzionale** — idee non urgenti per il futuro

## Regole

- Sii diretto e specifico — no commenti vaghi come "potresti migliorare questo"
- Mostra sempre il codice corretto, non solo la critica
- Se il codice è corretto, dillo chiaramente invece di inventare problemi
- Max 10 punti totali — prioritizza i più importanti
