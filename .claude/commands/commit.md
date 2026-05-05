# /commit — Genera Messaggio di Commit

Genera un messaggio di commit strutturato basato sulle modifiche correnti.

## Istruzioni

1. Esegui `git diff --staged` per vedere le modifiche staged
2. Se non ci sono modifiche staged, esegui `git diff` per vedere quelle unstaged
3. Analizza cosa è cambiato: tipo di modifica, scope, impatto
4. Carica le convenzioni di commit da `@.claude/memory/conventions.md` se esiste

## Formato commit

Usa il formato Conventional Commits:

```
type(scope): descrizione breve in italiano (max 72 caratteri)

[corpo opzionale: spiega il PERCHÉ, non il COSA]

[footer opzionale: breaking changes, issue references]
```

**Tipi:**
- `feat` — nuova funzionalità
- `fix` — correzione bug
- `refactor` — ristrutturazione senza cambio comportamento
- `chore` — task di manutenzione (deps, config, scripts)
- `docs` — solo documentazione
- `test` — aggiunta o modifica test
- `perf` — miglioramento performance
- `style` — formattazione, linting (no logica)

**Scope:** nome del modulo, feature o layer modificato (es. `auth`, `users`, `db`, `api`)

## Output atteso

Mostra il messaggio di commit pronto da copiare, dentro un blocco di codice.

Se le modifiche toccano più aree distinte, suggerisci di splittare in più commit e mostra un messaggio per ciascuno.

## Regole

- Non eseguire il commit automaticamente — mostra solo il messaggio
- Il messaggio deve descrivere il PERCHÉ della modifica, non solo il COSA
- Se le modifiche sono troppe per un singolo commit, dillo esplicitamente
