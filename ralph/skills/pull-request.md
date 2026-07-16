---
name: pull-request
description: "Ralph apre e mantiene una pull request durante il run autonomo. Trigger: pullRequest attivo nel prd.json, apri PR per la feature, push automatico storie."
---

# Ralph Pull Request

Quando `prd.json` dichiara `"pullRequest": true`, ogni iterazione Ralph — dopo aver
committato la storia completata — rende il lavoro visibile su una pull request.

## Comportamento

Dopo lo step di commit (step 9 dell'iterazione):

1. **Push** del branch corrente: `git push -u origin HEAD`.
2. **PR draft**: se per il branch non esiste già una PR aperta, creane una in bozza:
   `gh pr create --draft --fill --base <branch di default>`.
3. **Riuso**: se una PR per il branch esiste già, non crearne un'altra — le push
   successive di ogni storia la aggiornano automaticamente.

## Regole

- **Best-effort, non bloccante**: se `gh` non è installato o non autenticato, salta la
  creazione della PR senza errori — il push del branch è sufficiente.
- Resta non interattivo (policy Ralph): nessuna domanda, usa `--fill` per titolo/descrizione.
- Una sola PR per branch/run: il modello Ralph accumula le storie in sequenza sullo stesso
  branch, quindi la PR cresce storia dopo storia (non una PR separata per storia).
- Non marcare la storia come completata in base alla PR: il gate di completamento resta
  build/test (+ `reviewGate` se attivo). Vedi [[review-gate]].

## Attivazione

Nel `prd.json`:

```json
{
  "pullRequest": true
}
```

Il flag è letto da `ralph/ralph-once.ps1`, che inietta lo step `9b` nel prompt di iterazione.
