#!/usr/bin/env bash
# ralph/ralph-once.sh — Singola iterazione autonoma (bash)
# Uso: bash ralph/ralph-once.sh [project_dir]

set -e

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${1:-$(dirname "$RALPH_DIR")}"

# Controlla stop.signal all'inizio — consumato e rimosso prima di fare qualsiasi cosa
STOP_SIGNAL="$RALPH_DIR/stop.signal"
if [ -f "$STOP_SIGNAL" ]; then
  rm "$STOP_SIGNAL"
  echo "🛑 Stop signal ricevuto — uscita senza eseguire l'iterazione."
  exit 0
fi

PRD_PATH="$RALPH_DIR/prd.json"
if [ ! -f "$PRD_PATH" ]; then
  echo "ERRORE: prd.json non trovato in $PRD_PATH" >&2
  echo "Copia prd.template.json come prd.json prima di avviare Ralph." >&2
  exit 1
fi

BUILD_COMMAND=$(python3 -c "import json,sys; d=json.load(open('$PRD_PATH')); print(d.get('buildCommand',''))" 2>/dev/null || echo "")
TEST_COMMAND=$(python3 -c "import json,sys; d=json.load(open('$PRD_PATH')); print(d.get('testCommand',''))" 2>/dev/null || echo "")

echo "Ralph — Singola iterazione"
echo "Progetto:  $PROJECT_DIR"
echo "Ralph dir: $RALPH_DIR"
echo "=========================================="

# Costruisci riferimenti context
CONTEXT_REFS=()
[ -f "$PROJECT_DIR/.claude/memory/MEMORY.md" ] && CONTEXT_REFS+=("@.claude/memory/MEMORY.md")
CONTEXT_REFS+=("@ralph/prd.json" "@ralph/progress.txt")
[ -f "$RALPH_DIR/bigplan.md" ] && CONTEXT_REFS+=("@ralph/bigplan.md")
CONTEXT_BLOCK=$(printf '%s\n' "${CONTEXT_REFS[@]}")

TEST_LINE=""
[ -n "$TEST_COMMAND" ] && TEST_LINE="   - Test: \`$TEST_COMMAND\`"

PROMPT="$CONTEXT_BLOCK

## ISTRUZIONI PER QUESTA ITERAZIONE

1. Leggi @ralph/prd.json e individua la user story con priorità più alta (numero più basso) che ha \"passes\": false.
   Lavora ESCLUSIVAMENTE su quella storia — non iniziare la successiva.

2. Prima di scrivere codice, rileggi le convenzioni dei moduli caricati.

3. Implementa la feature seguendo i pattern esistenti nel codebase.

4. Verifica che il progetto compili e i test passino:
   - Build: \`$BUILD_COMMAND\`
$TEST_LINE

5. Aggiorna ralph/prd.json: imposta \"passes\": true sulla storia completata.

6. Aggiungi una riga a ralph/progress.txt nel formato:
   [US-XXX] Titolo storia — cosa è stato implementato

7. Se esiste ralph/bigplan.md, segna il task corrispondente come [x].

8. Fai un git commit con il formato Conventional Commits:
   feat(scope): descrizione in italiano

## REGOLE CRITICHE

- Sessione non interattiva (Ralph): permessi tool già concessi dall'invocazione (--dangerously-skip-permissions). Aggiorna senza indugi ralph/prd.json, ralph/run-state.json e ralph/progress.txt come richiesto sopra — non chiedere conferma né dire che servono permessi espliciti per questi file.
- Lavora su UNA SOLA user story per iterazione — mai più di una
- NON saltare la verifica del build — se fallisce, correggilo prima del commit
- Se tutte le user stories hanno \"passes\": true, output esattamente: <promise>COMPLETE</promise>"

echo ""
echo "Avvio Claude..."
cd "$PROJECT_DIR"
claude -p "$PROMPT" --dangerously-skip-permissions
