# Workflow: Piano a passi — Regole

> **Revisione doc:** 2026-10

## Principio

Un lavoro medio o grande si spezza in passi che si possono consegnare, rivedere e annullare uno alla volta. Ogni passo ha un brief che basta da solo: chi lo esegue non vede la conversazione e non deve indovinare. Alla fine si confronta ciò che era previsto con ciò che è cambiato davvero.

## Regole

- **Un passo grande è una PR**: se non si rivede in una sola lettura, o se un passo rompe la compilazione finché non arriva il successivo, si spezza di nuovo
- **Il brief di un passo contiene**: obiettivo in una riga, file da toccare, funzioni da riusare (con percorso), vincoli, criterio di verifica (comando o prova a mano), cosa non fare
- **Grafo delle dipendenze**: per ogni passo scrivi da quali dipende. Un passo senza dipendenze può partire subito; due passi senza dipendenze reciproche sono candidati a una corsia parallela
- **Corsie parallele solo con insiemi di file disgiunti**: mai due Dot che scrivono lo stesso file. I limiti sono quelli del Coordinatore (al massimo tre Dot insieme, e mai lo Sviluppatore con un altro Dot che scrive). Nel dubbio, in fila
- **Impatto previsto per passo**: chiamanti toccati, contratti o API che cambiano, test da aggiungere o aggiornare, documenti, come si torna indietro (rollback). Un impatto che non sai dire è una domanda da fare o un rischio da scrivere, non una riga vuota
- **Prima il contratto, poi il resto**: interfaccia o formato dei dati, poi dominio, poi infrastruttura, poi interfaccia utente
- **Confronto a fine lavoro**: l'impatto previsto si confronta con `git diff --stat` reale. Ogni scarto (un file in più, uno in meno) si spiega nel rapporto; uno scarto senza spiegazione è un rilievo per il Revisore
- **Un task per passo** quando il progetto ha `.claude/tasks/`: il passo diventa un task e il legame con gli altri passi sta in `legami`. Senza task, una riga per passo nel piano

## Pattern

Un passo, nella forma più corta che basta:

```
Passo 3 — Esportare i task in CSV (dipende da: 1)
Obiettivo: il pulsante «Esporta» scrive un file CSV con i task visibili.
File: src/tasks/export.js (nuovo), src/tasks/view.js (il pulsante), test/test_export.js (nuovo)
Riusa: formatDate() in src/util/dates.js
Vincoli: nessuna dipendenza nuova; i campi con virgole vanno tra virgolette
Verifica: node test/test_export.js; prova a mano con un titolo che contiene una virgola
Non fare: cambiare il formato dei task salvati
Impatto: chiamanti: solo view.js · API: nessuna · test: 1 nuovo · doc: README, una riga · rollback: git revert
```

| Passo | Dipende da | File | Corsia |
|---|---|---|---|
| 1 Formato dei dati | | `src/tasks/model.js` | A |
| 2 Logica di esportazione | 1 | `src/tasks/export.js` | A |
| 3 Pulsante e prova a mano | 2 | `src/tasks/view.js` | A |
| 4 Documentazione | 2 | `README.md` | B (disgiunta da A) |
