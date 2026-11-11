# Workflow: Verifica in sei fasi — Regole

> **Revisione doc:** 2026-10

## Principio

«Fatto» si dice dopo aver visto l'esito, non dopo aver riletto il codice. La verifica ha sei fasi sempre nello stesso ordine, ognuna con un esito: **PASS**, **FAIL** o **SALTATA** (con il motivo). Si eseguono tutte: non ci si ferma alla prima rossa, perché i fallimenti insieme dicono più di uno alla volta.

## Regole

- **Le fasi, nell'ordine**: 1 build, 2 tipi, 3 lint, 4 test, 5 grep di sicurezza, 6 rilettura del diff
- **Una fase manca nel progetto?** (niente tipi, niente build): SALTATA, con il motivo. Mai PASS per una fase che non è girata
- **Azioni di stack**: con `mcp__actions__list` e `mcp__actions__run` si usano le azioni di build, lint e test del progetto, che parametrizzano il comando e restituiscono esito e coda dell'output. Se gli strumenti non ci sono, si usano i comandi scritti nel `CLAUDE.md` o nel README, lanciati con `Bash`
- **Test**: prima i mirati sulla parte cambiata, la suite completa una volta alla fine
- **Grep di sicurezza** sul diff (non su tutto il repository): segreti e chiavi (`api_key`, `token`, `password`, `BEGIN PRIVATE KEY`), `console.log`, `print` o `debugger` di debug, `TODO` o `FIXME` nuovi, `.only`, `skip` e `xit` nei test
- **Rilettura del diff**: `git diff` per intero, con la richiesta originale accanto. Cerca ciò che il diff fa e la richiesta non diceva, e ciò che la richiesta diceva e il diff non fa
- **Un rosso non si aggira**: non si modifica il test, la configurazione del lint o una soglia per avere il verde. Si riporta

## Pattern

L'esito finale è una tabella di sei righe e un verdetto:

| Fase | Esito | Nota |
|---|---|---|
| 1 Build | PASS | |
| 2 Tipi | SALTATA | il progetto non ha un controllo dei tipi |
| 3 Lint | PASS | |
| 4 Test | FAIL | `test_x`: atteso 3, ottenuto 2 |
| 5 Grep di sicurezza | PASS | |
| 6 Diff | PASS | |

Verdetto in una riga: **verde** (nessun FAIL), **rosso** (almeno un FAIL, con il primo da correggere) o **incompleto** (SALTATA su una fase che il progetto ha). Sotto la tabella la riga «Non verificato».
