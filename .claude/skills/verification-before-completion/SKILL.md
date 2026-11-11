---
name: verification-before-completion
description: Use when about to say work is done, fixed or passing, and before committing or opening a PR — run the command that proves the claim and read its output first.
---
# Verifica prima di dire «fatto»

Un esito dichiarato (passa, corretto, finito) vale solo se poggia su un comando lanciato in questo turno, di cui hai letto l'output.

## Prima di dichiararlo
1. Individua il comando che prova l'affermazione.
2. Lancialo per intero, non una parte.
3. Leggi l'output e il codice d'uscita; conta i fallimenti.
4. Se l'output smentisce, riporta lo stato reale con l'evidenza; se conferma, afferma l'esito citando l'evidenza.

## Cosa non basta
| Affermazione | Serve | Non basta |
|---|---|---|
| I test passano | output della suite, 0 fallimenti | un giro precedente, «dovrebbe passare» |
| Il lint è pulito | output del linter | un controllo parziale |
| La build riesce | build con codice d'uscita 0 | il linter verde |
| Il bug è corretto | il sintomo originale non si riproduce più | il codice è cambiato |
| Il test di regressione serve | rosso senza il fix, verde con il fix | un solo giro verde |
| Un agente ha finito | il diff vero (`git diff`) | il suo «fatto» |
| I requisiti sono coperti | checklist sulla richiesta, punto per punto | i test verdi |

## Segnali d'allarme
- «dovrebbe», «probabilmente», «sembra»
- esultare prima della verifica
- commit, push o PR senza aver lanciato i controlli
- fidarsi del rapporto di un sub-agente o di un altro Dot senza guardare il diff

## Resoconto
Un fallimento visto nel giro, anche se non lo hai causato tu, va nel resoconto per nome. Se non puoi verificare (manca l'ambiente, serve l'utente), scrivi «non verificato: …» invece di affermare.

Adattata da obra/superpowers (licenza MIT, © 2025 Jesse Vincent): https://github.com/obra/superpowers/blob/main/LICENSE
