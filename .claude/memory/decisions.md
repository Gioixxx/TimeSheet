# Decisioni Architetturali

Registro delle scelte tecniche rilevanti prese durante lo sviluppo.
Ogni decisione include motivazione e alternative valutate.

---

<!-- TEMPLATE PER NUOVA DECISIONE:

### [Titolo breve]
**Data:** YYYY-MM-DD
**Decisione:** [cosa si è scelto di fare]
**Perché:** [motivazione — vincoli tecnici, requisiti, trade-off]
**Alternative scartate:** [cosa si è valutato e perché no]
**Impatto:** [moduli o aree del codice coinvolti]

-->

## Esempio (da rimuovere quando si popola)

### Uso di MediatR per CQRS
**Data:** 2025-01-15
**Decisione:** Adottare MediatR per separare command e query nel layer Application
**Perché:** Permette di isolare ogni use case in un handler testabile indipendentemente. Riduce il coupling tra Controller e Service.
**Alternative scartate:** Service class diretti — troppo accoppiati, difficili da testare in isolamento
**Impatto:** Tutti i moduli del layer Application, Controller in Presentation
