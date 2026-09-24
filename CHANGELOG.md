# Changelog

Tutte le modifiche rilevanti del progetto. Formato basato su
[Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni secondo [SemVer](https://semver.org/lang/it/).

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

[1.3.1]: https://github.com/Gioixxx/TimeSheet/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Gioixxx/TimeSheet/compare/v1.2.0...v1.3.0
