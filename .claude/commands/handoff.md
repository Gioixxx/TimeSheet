# /handoff — Genera brief di passaggio sessione

Produce un brief compatto e riusabile che riassume lo stato del lavoro corrente, pensato per essere consumato nella sessione successiva da un umano o da Claude.

## Input

- `git diff HEAD~1 HEAD` e `git log --oneline -10`
- `git status` — file modificati non committati
- `@.claude/memory/MEMORY.md`, `sprint.md`, `decisions.md`
- File e directory toccati nella sessione corrente (forniti dall'utente o rilevati dal diff)
- Contesto conversazione corrente (task completati, decisioni prese, problemi aperti)

## Sidecar Ollama (opzionale)

Se il server MCP `ollama-sidecar` è attivo, chiama il tool `summarize_diff` con l'output di
`git diff HEAD~1 HEAD` per generare automaticamente la sezione "Completato in questa sessione",
e `summarize_session` (git log + status + note della sessione) come bozza per le sezioni
"Problemi aperti / rischi" e "Prossimi passi" — integra la bozza con il contesto conversazione.
Se il sidecar non è disponibile, genera le sezioni dal log git e dal contesto conversazione.

## Regole

- Max 40 righe totali — deve essere leggibile in 60 secondi
- Usa sezioni fisse nell'ordine definito nell'output
- Non includere codice completo — solo path, nomi, riferimenti
- Se una sezione è vuota, scrivila comunque con "(nessuno)" per chiarezza
- Il brief deve essere autonomo: chi lo legge in una sessione vuota deve capire tutto

## Output

Genera un brief in questo formato esatto (Markdown, copiabile direttamente in una nuova sessione):

```markdown
## Handoff — <data e ora>

**Progetto:** <nome progetto>
**Branch:** <branch corrente>
**Stato:** <in-progress | blocked | review-ready | done>

### Completato in questa sessione
- <cosa è stato fatto, con file/componente coinvolto>

### File toccati
- `<path>` — <modifica in una riga>

### Decisioni prese
- <decisione> → <motivazione breve>

### Problemi aperti / rischi
- <problema o rischio> — <impatto o workaround noto>

### Prossimi passi
1. <passo immediatamente successivo>
2. <passo dopo>

### Contesto per la prossima sessione
<1-3 frasi su cosa sa solo chi ha lavorato oggi: invarianti nascoste, workaround temporanei, cosa non toccare>
```

Dopo il brief, aggiungi una riga:
> Per riprendere: carica questo brief nella nuova sessione e usa `/session-start` per il briefing completo.
