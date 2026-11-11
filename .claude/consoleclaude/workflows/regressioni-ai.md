# Workflow: Punti ciechi del codice scritto da un modello — Regole

> **Revisione doc:** 2026-10

## Principio

Quando lo stesso modello scrive il codice e lo rivede, gli stessi errori sfuggono a tutti e due: ciò che a chi scrive «sembra giusto» sembra giusto anche a chi legge. Un controllo vale se può dare torto. Questo elenco serve a Revisore e Tester per cercare dove un controllo indipendente manca.

## Regole

- **Test che confermano l'implementazione** invece della richiesta: il valore atteso è stato copiato dal risultato del codice. Si riscrive partendo dal criterio di accettazione, senza guardare il codice
- **Mock che nascondono il comportamento vero**: se il mock risponde sempre bene, il test non prova la parte che fallisce. Si mocka solo il confine esterno
- **API, opzioni o file inventati**: una funzione, un flag o un campo di configurazione che «dovrebbe esistere». Ogni nome citato si cerca con Grep nel codice reale o nella documentazione
- **Nomi e commenti presi per prova**: `validateInput` non dimostra che l'input sia validato. Si legge il corpo
- **Casi limite che nessuno dei due ha immaginato**: vuoto, nullo, molto grande, caratteri speciali, fuso orario, due richieste insieme
- **Codice vicino copiato con il suo difetto**: il modello imita lo stile e l'errore di ciò che ha davanti. Si controlla il modello, non solo la copia
- **«Sembra giusto» al posto di «l'ho eseguito»**: ciò che non è stato eseguito va nella riga «Non verificato», non fra le certezze

## Contromisure

- Rileggi la **richiesta originale**, non il riassunto che ne ha fatto chi ha scritto il codice
- Un test che parte dal **criterio di accettazione**, scritto prima di leggere l'implementazione
- **Prova a rompere**: l'input che il codice non si aspetta, l'ordine inverso, il secondo lancio
- Verifica **ogni API citata** su file reali; se non la trovi, è un rilievo
- Una modifica a un test insieme al codice che testa è un segnale: chiediti se il test è stato adattato al codice
