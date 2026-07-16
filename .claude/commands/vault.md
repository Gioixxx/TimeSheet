# /vault — Cerca e scrivi nel vault (memoria progetto + cervello globale)

## Input
Query o nota dall'utente. Opzionale: scope `progetto` (`.claude/memory/`) o `brain` (`~/.claude/brain/`). Default: cerca in entrambi.

## Regole
- **Cerca:** usa `library-router` MCP (`search`, scope `memory`) se disponibile; altrimenti leggi diretto i file `.md` del vault.
- **Scrivi:** classifica la nota (decisione, pattern, dominio, sprint, stack-note) e scrivi nel file giusto. Una nota va nel **brain** solo se utile in ≥2 progetti, altrimenti nella memoria progetto.
- **Frontmatter:** ogni file inizia con `type`/`tags`/`updated`; aggiorna `updated` quando scrivi.
- **Wikilink:** collega la nota a note correlate con `[[nome]]` (es. una decisione → `[[domain]]`).
- Non duplicare: aggiorna l'esistente. Non rompere `@import` né le strutture (task `[ ]`/`[x]`).
- Convenzioni complete: `@.claude/libs/workflows/obsidian-vault.md`.

## Output
Conferma cosa salvato/trovato e in quale vault/file.
