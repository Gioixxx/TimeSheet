# Tech Debt

Registro del debito tecnico accumulato durante lo sviluppo.
Ogni item include la priorità, il contesto di origine e il piano di risoluzione.
Aggiornato da `/session-end`.

---

<!-- TEMPLATE PER NUOVO ITEM:

### [Titolo breve — cosa è il debito]
**Priorità:** Alta / Media / Bassa
**Area:** [modulo, layer, o feature coinvolta]
**Data:** YYYY-MM-DD
**Introdotto da:** [commit hash o descrizione della sessione]
**Descrizione:** [cosa è il problema — duplicazione, workaround, astrazione mancante, ecc.]
**Perché rimandato:** [motivo — deadline, dipendenza esterna, complessità]
**Impatto attuale:** [rallenta sviluppo / rischio bug / problema performance / tech risk]
**Risoluzione suggerita:** [come andrebbe affrontato]

-->

## Alta priorità

<!-- Item che bloccano o rallentano significativamente lo sviluppo -->

## Media priorità

<!-- Item che introducono rischio o duplicazione ma non bloccano -->

## Bassa priorità

<!-- Miglioramenti non urgenti, pulizia, refactoring cosmetici -->

---

## Archiviato

<!-- Item risolti — non eliminare, servono come storico -->

### Esempio (da rimuovere quando si popola)
**Priorità:** Bassa
**Area:** Struttura Iniziale
**Data:** 2026-04-19
**Introdotto da:** Inizio progetto
**Descrizione:** La struttura iniziale del progetto è generica e necessita di essere raffinata per allinearsi alle best practice di Next.js specifiche del dominio TimeSheet.
**Perché rimandato:** Priorità all'implementazione delle funzionalità core.
**Impatto attuale:** Nessun impatto immediato, ma potenziale per refactoring futuro.
**Risoluzione suggerita:** Rivedere e standardizzare la struttura delle cartelle e dei componenti React dopo le prime user stories.