# /doc — Genera Documentazione Tecnica

Genera documentazione strutturata per un'unità di codice specifica (endpoint, componente, service, funzione, modulo). Output formale persistibile con template — non una spiegazione conversazionale (per quella usa `/explain`).

## Istruzioni

1. Leggi il codice selezionato. Se non c'è selezione, chiedi: "Quale file, funzione o endpoint vuoi documentare?"
2. Leggi `@.claude/memory/conventions.md` per adattare lo stile al progetto
3. Leggi `@.claude/memory/decisions.md` per includere motivazioni architetturali rilevanti
4. Leggi `@.claude/memory/domain.md` per usare il vocabolario corretto
5. Rileva il tipo di unità da documentare:
   - **API endpoint** — route HTTP con metodo, path, controller
   - **Service / Use Case** — classe con logica di business iniettata
   - **Componente UI** — componente React, Angular, React Native con props
   - **Funzione / Utility** — funzione standalone o metodo di utilità
   - **Modulo / Libreria** — file index o punto di entrata di un sotto-modulo
6. Carica il template corrispondente da `@.claude/libs/snippets/doc-patterns.md`
7. Rileva lo stack dal progetto (estensione file, import, `MEMORY.md`) per adattare il formato docstring (TypeScript/Python/Java/C#)
8. Genera la documentazione compilando il template con le informazioni estratte dal codice
9. Mostra la proposta e chiedi: "Dove vuoi inserirla? (inline nel codice / sezione README / file separato)"

## Tipi di output per unità

**API endpoint**
Usa il template "Template API Endpoint" da `doc-patterns.md`. Include: metodo HTTP, path, descrizione, autenticazione, parametri path/query, request body, response 200 con esempio JSON, tabella errori, esempio HTTP completo.

**Service / Use Case**
Usa il template "Template Service / Use Case". Include: responsabilità in una frase, dipendenze iniettate, ogni metodo pubblico con firma + precondizioni + side effect + eccezioni, note architetturali se non ovvio.

**Componente UI**
Usa il template "Template Componente UI". Include: descrizione e contesto d'uso, tabella props (nome/tipo/default/richiesto/descrizione), events/output/callback, esempio di utilizzo in JSX o Angular template.

**Funzione / Utility**
Usa il template "Template Funzione / Utility" nel formato corretto per lo stack rilevato (JSDoc per TS/JS, docstring per Python, Javadoc per Java/C#). Include: @param, @returns, @throws, @example.

**Modulo / Libreria**
Usa il template "Template README Sezione Modulo". Include: scopo in 2 righe, exports principali, setup/dipendenze, esempio minimo funzionante.

## Output atteso

```
Proposta documentazione per [NomeUnità] ([tipo]):
---
[testo documentale formattato con il template appropriato]
---
Dove vuoi inserirla?
- Inline nel codice come docstring/commento
- Sezione nel README.md
- File separato (specificare nome)
```

## Regole

- Non scrivere nessun file senza conferma esplicita dell'utente
- Non ricopiare il codice — spiegare l'intenzione e il contratto, non l'implementazione
- Includere sempre almeno un esempio d'uso concreto e funzionante
- Documentare i casi d'errore, non solo l'happy path
- Se la firma è completamente autoesplicativa, non aggiungere doc banale (es. `// restituisce l'utente` su `getUser()`)
- Usare il vocabolario di dominio da `domain.md` quando disponibile
- Se il codice è troppo accoppiato o ha side effect nascosti che lo rendono difficile da documentare con precisione, segnalarlo: "Questo codice ha comportamenti impliciti difficili da documentare chiaramente — considera un refactoring prima di documentarlo"
- Non modificare la logica del codice per renderla più documentabile
- Per breaking change, suggerire di usare il template "Template BREAKING CHANGE" da `doc-patterns.md`
