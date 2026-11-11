# Workflow: Criteri di accettazione — Regole

> **Revisione doc:** 2026-10

## Principio

Una richiesta ambigua si trasforma in criteri che una persona o una macchina può verificare. Se un criterio non si può provare, non è un criterio: o si riscrive, o è una domanda da fare. Meglio due domande prima che un lavoro rifatto dopo.

## Regole

- **Forma «Dato / Quando / Allora»**: lo stato di partenza, l'azione, ciò che si osserva. Un criterio, un comportamento
- **Osservabile**: l'«Allora» descrive qualcosa che si vede o si misura (un testo a schermo, un codice di uscita, un file creato), mai un'intenzione («funziona bene», «è più chiaro»)
- **Ogni criterio ha la sua prova**: un test automatico, un comando con il suo esito atteso, o una prova a mano descritta passo per passo
- **Casi negativi**: per ogni criterio positivo chiediti cosa succede con input vuoto, troppo grande, doppio, o senza permesso, e scrivi almeno un criterio per il caso che più probabilmente si rompe
- **Fuori perimetro, esplicito**: una sezione che dice cosa NON si fa in questo lavoro. Ciò che non serve alla richiesta va lì, non nel piano
- **Un'ambiguità è una domanda**, non un'ipotesi taciuta: 2-4 opzioni chiare e una raccomandazione col motivo. Si chiede solo ciò che cambia i criteri o il piano; ciò che si legge nel codice si legge
- **Le ipotesi si scrivono**: se non puoi chiedere (lavori su incarico di un altro Dot), elenca le ipotesi fatte accanto ai criteri, così chi decide le corregge
- **I criteri vanno al Tester** insieme al brief: un test parte dal criterio, non dall'implementazione

## Pattern

Prima: «Rendi più chiaro il pannello dei dettagli».

Dopo, con le domande che restano aperte:

```
Criteri
1. Dato un elemento selezionato, quando si apre il pannello, allora il titolo è la prima riga e ha un corpo di almeno 16 px.
   Prova: misura del layout / prova a mano a 1280 px.
2. Dato un elemento senza descrizione, quando si apre il pannello, allora compare «Nessuna descrizione» al posto di un vuoto.
   Prova: test sul rendering del pannello.
3. Dato il pannello aperto, quando si preme Esc, allora si chiude e il focus torna all'elemento.
   Prova: prova a mano da tastiera.
Fuori perimetro: i colori del tema, la lista a sinistra, i testi in altre lingue.

Domande
- «Più chiaro» riguarda il testo, l'ordine delle informazioni o lo spazio? Opzioni: (a) ordine e gerarchia dei titoli (consigliata: è ciò che cambia di più con meno rischio), (b) dimensioni e spazi, (c) tutte e due.
```

| Criterio debole | Riscritto |
|---|---|
| «La ricerca è veloce» | Dato un elenco di 5000 voci, quando scrivo tre lettere, allora i risultati compaiono in meno di 200 ms |
| «Gestisce gli errori» | Dato il server spento, quando salvo, allora compare il messaggio d'errore e i dati restano nel modulo |
