# Workflow: Cicli di agenti — Regole

> **Revisione doc:** 2026-10

## Principio

Un ciclo (scrivi, verifica, correggi) funziona solo se la verifica è decisa da una macchina e il ciclo ha dei freni. Senza un esito che non si discute il ciclo gira finché si stanca; senza freni consuma tempo per ripetere lo stesso errore, o passa dichiarando verde ciò che ha manomesso.

## Regole

- **Obiettivo decidibile da una macchina**: un codice di uscita, un test che passa, una misura sotto una soglia. «Migliora il codice» non è un obiettivo di ciclo; «`node test/run.js` esce con 0» sì
- **Tetto di tentativi**: al massimo due giri di correzione, come il Coordinatore. Poi ci si ferma e si riporta cosa resta, con cosa è stato provato
- **Freno 1, giro a vuoto**: lo stesso errore, o lo stesso diff, due volte di seguito. Si ferma: un terzo tentativo uguale non cambia l'esito. Si riporta l'errore e un'ipotesi diversa
- **Freno 2, aggirare il verificatore**: modificare un test, la configurazione del lint o una soglia, aggiungere `skip` o `.only`, escludere un file dal controllo per ottenere il verde. È ❌ e si ferma, anche se il verde arriva. Il verificatore si cambia solo se la richiesta lo chiede
- **Freno 3, la risposta sbagliata portata a termine**: prima di dire fatto si rilegge la richiesta originale (non il riassunto) e si confronta con ciò che il ciclo ha prodotto. Un verde su un obiettivo sbagliato è un verde inutile
- **Ogni giro ha un perimetro**: la correzione tocca ciò che il rilievo indica. Il verificatore rilegge il diff della correzione, non tutto il lavoro
- **Doppia revisione, solo se l'utente la chiede**: due Revisori indipendenti, stesso brief e stessa rubrica, senza vedere l'uno il rapporto dell'altro. Si confrontano alla fine: i rilievi trovati da tutti e due sono i più sicuri, quelli di uno solo si verificano. Di norma una revisione basta: due costano il doppio
- **Voci in disaccordo, per le scelte go/no-go**: prima di decidere (unire, rilasciare, cambiare un formato) si scrive la tesi migliore a favore e la migliore contro, ognuna con le sue prove. Poi si decide, o si chiede all'utente se le due pesano uguale

## Pattern

| Situazione | Freno | Azione |
|---|---|---|
| Stesso test rosso, stesso messaggio, due giri | Giro a vuoto | Fermati, riporta l'errore e una causa diversa da provare |
| Il test rosso passa perché ora è `skip` | Verificatore aggirato | ❌, ripristina il test, riporta il rosso |
| Il test è verde ma fa altro rispetto alla richiesta | Risposta sbagliata | Rileggi la richiesta, riscrivi il test dal criterio |
| Due giri fatti, resta un rosso | Tetto | Fermati e riporta cosa resta |

Esempio di nota di ciclo nel rapporto:

```
Giro 1: node test/run.js → rosso in test_export.js (atteso 3 righe, ottenute 2). Correzione: ordine delle colonne.
Giro 2: verde. Richiesta riletta: l'esportazione include anche i task chiusi → verificato con un caso a mano.
```
