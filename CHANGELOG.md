# Changelog

Tutte le modifiche rilevanti del progetto. Formato basato su
[Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni secondo [SemVer](https://semver.org/lang/it/).

## [1.4.0] - 2026-09-25

### Aggiunto
- **Ore oltre le 8h:** quando una voce di lavoro (Supporto, Manutenzione) porta il giorno oltre
  le 8 ore, prima di salvare l'app chiede cosa fare delle ore in più:
  - **come straordinario** — la voce viene divisa: la parte entro le 8h resta del tipo scelto e
    l'eccedenza diventa una voce **Straordinario** nello stesso giorno;
  - **spostandole** — l'eccedenza passa al giorno lavorativo successivo e, se non basta, prosegue
    sui giorni seguenti riempiendo ciascuno fino a 8h. Weekend, festivi e giorni già pieni vengono
    saltati. Il pannello mostra in anticipo dove finiranno le ore.

  Vale per il form di inserimento, "Compila e salva" con l'AI, la registrazione dai post-it e la
  modifica di una voce (in modifica solo se l'eccedenza aumenta). Le voci Straordinario non
  contano tra le 8h; ferie e permessi sì, e non fanno partire la domanda.

### Corretto
- **Modifica voce:** il dialog riparte sempre dai valori salvati. Prima, chiudendolo senza salvare,
  alla riapertura si ritrovavano i valori digitati.

## [1.3.1] - 2026-09-24

### Aggiunto
- **Export Excel, foglio Riepilogo:** tabella a doppia entrata cliente/progetto × tipo attività,
  con subtotale per cliente, sezione **Assenze** separata (ferie anche in giorni, permessi in ore),
  totale del mese e straordinari.
- **Export Excel, foglio Dettaglio:** date vere (ordinabili e filtrabili), giorno della settimana,
  filtro automatico e totale `SUBTOTAL` che segue i filtri applicati. Le voci senza cliente o
  progetto vanno in fondo.
- **Ricerca globale:** cliccando un risultato si apre la pagina del giorno della voce, che viene
  portata in vista ed evidenziata.

### Corretto
- **Calendario mensile:** le ferie su giorni lavorativi ora scalano le **ore attese** (massimo 8h
  per giorno) e non contano più come ore lavorate in ore del mese, avanzamento, media e giorni attivi.

## [1.3.0] - 2026-09-15

- Pannello attività allineato al form di inserimento manuale e correzione dei 20 bug emersi
  dall'audit statico.

[1.4.0]: https://github.com/Gioixxx/TimeSheet/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/Gioixxx/TimeSheet/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Gioixxx/TimeSheet/compare/v1.2.0...v1.3.0
