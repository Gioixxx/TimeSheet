# /lib-new — Scaffold di un nuovo modulo claude-libs

Crea un nuovo stack, agente, workflow o snippet con i file, i path e le convenzioni
giuste, poi cabla i registry. Pensato per chi **estende la libreria** (non per i progetti consumer).

## Input

Tipo di modulo (`stack` | `agent` | `workflow` | `snippet`), nome in kebab-case e una
descrizione breve. Per agenti stack-specifici, lo stack di riferimento.

## Flusso

1. **Raccogli** tipo, nome (kebab-case), descrizione; per `agent` chiedi se è generale o stack-specifico.
2. **Esegui lo scaffolder** (parte meccanica — crea i file dal template e rigenera il catalogo):
   `powershell -File .claude/libs/scripts/maintain/new-module.ps1 -Type <tipo> -Name <nome> -Description "<desc>" [-Stack <stack>]`
3. **Completa i "Prossimi passi"** stampati dallo script — questa è la parte che richiede giudizio
   e che fai tu, non lo script:
   - **CLAUDE.md**: aggiungi la riga di catalogo nella sezione giusta (con una descrizione di qualità).
     Se il server MCP `ollama-sidecar` è attivo, chiama `describe_module` con il contenuto del modulo
     come bozza per descrizione/tags/related — valida i `related_modules` proposti contro i file reali
     e `schemas/related-modules.json` prima di usarli. Se `ollama_unavailable: true`, scrivi la descrizione a mano.
   - **stack** (solo): `schemas/stack-bundles.json` (componi il bundle), enum `stack` in
     `schemas/workspace.schema.json` e `ralph/prd.schema.json`, `KNOWN_STACKS` in
     `scripts/release/generate-catalog.py`, relazioni in `schemas/related-modules.json`.
   - Sostituisci i placeholder `{{...}}` nei file generati con contenuto reale.
4. **Rigenera e valida**: `python .claude/libs/scripts/release/generate-catalog.py` poi
   `bash .claude/libs/scripts/validate/validate.sh --strict` → deve uscire 0.

## Regole

- Non inventare path o nomi file: usa lo scaffolder, che applica le convenzioni (pair
  `<nome>.md`/`-reference.md`, `agents/general/` vs `agents/<stack>/check.md`).
- Non riscrivere a mano `catalog.json`: è generato.
- Non committare con `validate.sh --strict` rosso (file non documentato, catalog drift, snippet senza code block).
- Conventional commit a fine lavoro (`feat(<area>): nuovo modulo <nome>`).

## Output

Riepilogo dei file creati, dei passi registry completati e dell'esito di `validate.sh --strict`.
