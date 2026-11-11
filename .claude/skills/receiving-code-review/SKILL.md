---
name: receiving-code-review
description: Use when you receive code review feedback (a reviewer, the Revisore, a PR comment or the user) and are about to act on it, especially if an item is unclear or looks technically doubtful.
---
# Ricevere una review

Un rilievo è un'ipotesi da verificare, non un ordine. Prima di cambiare codice controlla che sia giusto per questo codice.

## Sequenza
1. Leggi tutto il feedback prima di toccare qualcosa.
2. Ridì il requisito con parole tue; se non ci riesci, chiedi.
3. Verifica sul codice: è vero? Rompe altro? C'è un motivo per l'implementazione attuale? Vale su tutte le piattaforme e versioni supportate?
4. Decidi: applica, oppure rispondi con una ragione tecnica.
5. Applica un punto per volta, ognuno col suo test, e controlla le regressioni.

## Punti poco chiari
Se anche uno solo non è chiaro, non implementare niente: i punti possono dipendere l'uno dall'altro. Scrivi quali hai capito e chiedi chiarimenti sugli altri.

## Quando contestare
- Il suggerimento rompe una funzione esistente o è sbagliato per questo stack.
- Il revisore non aveva il contesto (compatibilità, scelte già prese).
- Chiede di «farla bene» una funzione che nessuno usa: cerca i chiamanti, e se non ce ne sono proponi di rimuoverla.
- Contraddice una decisione dell'utente: fermati e parlane prima.

Contesta con motivi tecnici, domande precise e rimandi a test o codice che funzionano. Se non puoi verificare, dillo: «non posso verificarlo senza X: procedo, indago o chiedo?».

## Ordine
Prima i bloccanti (rotture, sicurezza), poi le correzioni semplici (nomi, import), poi quelle complesse (logica, rifattorizzazioni).

## Tono
Niente conferme di circostanza né ringraziamenti: scrivi che cosa hai cambiato e dove, o perché non lo cambi. Se avevi contestato e il revisore aveva ragione, dillo in una riga e correggi.

## Review su GitHub
Rispondi nel thread del commento (con `gh api`, sull'endpoint delle risposte al commento), non con un commento generale al PR.

Adattata da obra/superpowers (licenza MIT, © 2025 Jesse Vincent): https://github.com/obra/superpowers/blob/main/LICENSE
