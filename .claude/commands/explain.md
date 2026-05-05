# /explain — Spiega il Codice

Spiega il codice selezionato in linguaggio naturale. Utile per onboarding, code review, o quando si torna su codice scritto mesi fa.

## Istruzioni

1. Leggi il codice selezionato o il file indicato dall'utente
2. Leggi `@.claude/memory/domain.md` per il vocabolario di dominio (per spiegare nel contesto giusto)
3. Leggi `@.claude/memory/decisions.md` per capire il "perché" architetturale se rilevante
4. Chiedi all'utente (solo se non è evidente dal contesto): "Stai cercando una spiegazione tecnica dettagliata o una panoramica ad alto livello?"

## Output atteso

Struttura la spiegazione in tre livelli, dall'alto al basso:

---

**Cosa fa (in una frase)**
[Descrizione in linguaggio naturale, senza gergo tecnico non necessario]

**Come funziona**
[Spiegazione passo-passo del flusso logico — non ricopiare il codice, spiegarne l'intenzione]

1. [Step 1 — cosa fa e perché]
2. [Step 2 — ...]
3. [...]

**Dettagli tecnici rilevanti**
[Pattern usati, dipendenze chiave, side effect, precondizioni, casi limite importanti]

**Connessioni con il resto del sistema**
[Chi chiama questo codice? Cosa chiama? Da cosa dipende?]

**Perché è scritto così** *(solo se c'è una ragione non ovvia)*
[Decisione architettuale, vincolo tecnico, o trade-off che spiega una scelta insolita — da decisions.md se disponibile]

---

## Regole

- Usa il vocabolario di dominio del progetto (`domain.md`) quando possibile
- Livello di dettaglio adattato al contesto: se è un componente UI semplice, non servono 5 sezioni
- Se il codice ha bug evidenti o anti-pattern, segnalali **dopo** la spiegazione in una sezione separata "⚠️ Note"
- Non riscrivere il codice — solo spiegarlo
- Se il codice è davvero incomprensibile (naming oscuro, logica contorta), dillo esplicitamente e suggerisci `/refactor`
- Non modificare nessun file — solo output testuale
