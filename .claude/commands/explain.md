# /explain — Spiega il codice

## Input
Codice selezionato. `@.claude/memory/domain.md` per vocabolario, `decisions.md` per motivazioni.

## Regole
- Usa vocabolario dominio
- 3 livelli: Cosa fa → Come funziona → Dettagli tecnici
- Se bug/anti-pattern, segnala dopo la spiegazione
- Non riscrivere codice — solo spiega
- Se incomprensibile, suggerisci `/refactor`

## Output
Cosa fa (1 frase), Come funziona (passi), Dettagli, Connessioni, Perché scritto così
