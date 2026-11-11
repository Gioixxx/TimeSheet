# Sviluppo Iterativo — Reference
> **Revisione doc:** 2026-04

> Dettagli, esempi e regole complete per il workflow di Sviluppo Iterativo.

---

## Ciclo di lavoro standard — Dettagli

```
1. ANALISI   → Leggi i file rilevanti prima di scrivere qualsiasi cosa
2. PIANO     → Descrivi cosa farai in 3-5 punti prima di iniziare
3. IMPLEMENT → Scrivi il codice, un file alla volta
4. VERIFICA  → Controlla che compili / i test passino
5. REPORT    → Riassumi cosa hai fatto e cosa rimane
```

Se un task è complesso, **chiedi conferma sul piano** prima di implementare.

---

## Regole operative — Dettagli

### Prima di modificare un file
- Leggi per intero un file corto; di un file lungo la parte che cambi e quella che la usa (cerca i chiamanti con Grep)
- Identifica le dipendenze (chi lo usa, cosa importa)
- Segnala se la modifica richiede cambiamenti a cascata

### Quando aggiungi una feature
- Inizia dall'interfaccia/contratto (interfaccia, tipo, schema)
- Poi implementa il layer di dominio/logica
- Poi l'infrastruttura (DB, API call)
- Infine la UI

### Quando trovi un problema non nel task corrente
- Segnalalo con `⚠️ NOTA:` ma non fixarlo ora
- Continua con il task originale
- Crea un TODO commentato nel codice se è critico

---

## Gestione errori e blocchi — Dettagli

Se ti blocchi su un errore:
1. Mostra l'errore completo
2. Spiega le 2-3 cause più probabili
3. Prova la più probabile
4. Se fallisce, spiega perché e prova la successiva

**Non girare in loop sullo stesso approccio più di 2 volte.** Dopo 2 tentativi falliti, fermati e chiedi.

---

## Comunicazione — Guida completa

- Usa ✅ per step completati
- Usa 🔄 per step in corso
- Usa ⚠️ per warning non bloccanti
- Usa ❌ per errori bloccanti
- Usa 💡 per suggerimenti/alternative

---

## Dimensione dei task — Dettagli

- **Task piccolo** (< 30 min): implementa direttamente
- **Task medio** (30-90 min): descrivi il piano, poi implementa
- **Task grande** (> 90 min): spezza in subtask, lavora su uno alla volta

---

## Commit message — Formato completo

Quando suggerisci un commit, usa il formato:
```
type(scope): descrizione breve in italiano

- dettaglio 1
- dettaglio 2
```

Tipi: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
