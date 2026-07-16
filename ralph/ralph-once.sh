#!/usr/bin/env bash
# ralph/ralph-once.sh — Singola iterazione autonoma (bash)
# Uso: bash ralph/ralph-once.sh [project_dir]
# Env: RALPH_RUNNER=claude|cursor (default: claude)

set -e

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${1:-$(dirname "$RALPH_DIR")}"
RUNNER="${RALPH_RUNNER:-claude}"

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
CONTEXT_SYNC=$(python3 -c "import json,sys; d=json.load(open('$PRD_PATH')); print(str(d.get('contextSync', True)).lower())" 2>/dev/null || echo "true")

echo "Ralph — Singola iterazione"
echo "Progetto:  $PROJECT_DIR"
echo "Ralph dir: $RALPH_DIR"
echo "Runner:    $RUNNER"
echo "=========================================="

# Su Windows/Git Bash preferire ralph-once.ps1 se disponibile
PS_ONCE="$RALPH_DIR/ralph-once.ps1"
if [ -f "$PS_ONCE" ] && command -v powershell.exe >/dev/null 2>&1; then
  echo ""
  echo "Delega a ralph-once.ps1 (-Runner $RUNNER)..."
  exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PS_ONCE" \
    -ProjectDir "$PROJECT_DIR" -Runner "$RUNNER"
fi

# Costruisci riferimenti context
CONTEXT_REFS=()
[ -f "$PROJECT_DIR/.claude/memory/MEMORY.md" ] && CONTEXT_REFS+=("@.claude/memory/MEMORY.md")
CONTEXT_REFS+=("@ralph/prd.json" "@ralph/progress.txt")
[ -f "$RALPH_DIR/bigplan.md" ] && CONTEXT_REFS+=("@ralph/bigplan.md")
CONTEXT_BLOCK=$(printf '%s\n' "${CONTEXT_REFS[@]}")

TEST_LINE=""
[ -n "$TEST_COMMAND" ] && TEST_LINE="   - Test: \`$TEST_COMMAND\`"

# Context sync (contextSync, default true): sync memoria post-story best-effort,
# vedi workflows/story-context-sync.md. Parità con ralph-once.ps1 (step 9c).
CONTEXT_SYNC_STEP=""
if [ "$CONTEXT_SYNC" = "true" ]; then
  CONTEXT_SYNC_STEP="
8b. CONTEXT SYNC (contextSync attivo, best-effort): dopo il commit analizza la diff della storia
    con il tool mcp__ollama-sidecar__analyze_story_completion (se disponibile) e applica gli
    aggiornamenti: convenzioni in CLAUDE.md, decisioni in .claude/memory/decisions.md, sprint.md.
    Se il tool/Ollama non è disponibile aggiorna solo .claude/memory/sprint.md e logga in
    ralph/progress.txt: [context-sync] Ollama non disponibile — solo sprint.md aggiornato.
    Non bloccare mai l'iterazione per errori del sync.
"
fi

PROMPT="$CONTEXT_BLOCK

## ISTRUZIONI PER QUESTA ITERAZIONE

1. Leggi @ralph/prd.json e individua la user story con priorità più alta (numero più basso) che ha \"passes\": false.
   Lavora ESCLUSIVAMENTE su quella storia — non iniziare la successiva.

2. Prima di scrivere codice, rileggi le convenzioni dei moduli caricati.

3. Implementa la feature seguendo i pattern esistenti nel codebase.

4. Verifica che il progetto compili e i test passino:
   - Build: \`$BUILD_COMMAND\`
$TEST_LINE
   Prima di completare la storia, usa le skill first-party di Claude Code (Skill tool) sulla diff:
   \`/code-review\` (bug + cleanup), \`/security-review\` (modifiche pendenti), \`/verify\` (l'app funziona).
   Correggi i rilievi bloccanti nella stessa iterazione.

5. Aggiorna ralph/prd.json: imposta \"passes\": true sulla storia completata.

6. Aggiungi una riga a ralph/progress.txt nel formato:
   [US-XXX] Titolo storia — cosa è stato implementato

7. Se esiste ralph/bigplan.md, segna il task corrispondente come [x].

8. Fai un git commit con il formato Conventional Commits:
   feat(scope): descrizione in italiano
$CONTEXT_SYNC_STEP
## REGOLE CRITICHE

- Sessione non interattiva (Ralph): permessi tool già concessi dall'invocazione (--dangerously-skip-permissions). Aggiorna senza indugi ralph/prd.json, ralph/run-state.json e ralph/progress.txt come richiesto sopra — non chiedere conferma né dire che servono permessi espliciti per questi file.
- Lavora su UNA SOLA user story per iterazione — mai più di una
- NON saltare la verifica del build — se fallisce, correggilo prima del commit
- Se tutte le user stories hanno \"passes\": true, output esattamente: <promise>COMPLETE</promise>"

if [ "$RUNNER" = "cursor" ]; then
  LIBS_ROOT="${CLAUDE_LIBS_PATH:-}"
  if [ -z "$LIBS_ROOT" ] && [ -f "$HOME/.claude_libs_path" ]; then
    LIBS_ROOT="$(tr -d '\r\n' < "$HOME/.claude_libs_path")"
  fi
  CURSOR_SCRIPT="${LIBS_ROOT}/scripts/ralph/cursor_run.py"
  if [ -z "$CURSOR_API_KEY" ]; then
    echo "ERRORE: CURSOR_API_KEY richiesta per RALPH_RUNNER=cursor" >&2
    exit 1
  fi
  if [ ! -f "$CURSOR_SCRIPT" ]; then
    echo "ERRORE: cursor_run.py non trovato in $CURSOR_SCRIPT" >&2
    exit 1
  fi
  TMP_PROMPT="$(mktemp)"
  trap 'rm -f "$TMP_PROMPT"' EXIT
  printf '%s' "$PROMPT" > "$TMP_PROMPT"
  echo ""
  echo "Avvio Cursor..."
  cd "$PROJECT_DIR"
  exec python3 "$CURSOR_SCRIPT" --cwd "$PROJECT_DIR" --prompt-file "$TMP_PROMPT" --verbose
fi

# Permessi in `-p`: --dangerously-skip-permissions è ignorato se il bypass non è mai stato
# accettato (bypassPermissionsModeAccepted in ~/.claude.json) e ogni Write/Edit viene
# auto-negato. Parità con Get-ClaudeRalphPermissionArgs in lib/Invoke-RalphRunner.ps1;
# grep invece di parse JSON: regge anche ~/.claude.json con chiavi duplicate.
PERMISSION_ARGS=(--permission-mode acceptEdits)
if grep -q '"bypassPermissionsModeAccepted"[[:space:]]*:[[:space:]]*true' "$HOME/.claude.json" 2>/dev/null; then
  PERMISSION_ARGS=(--dangerously-skip-permissions --permission-mode bypassPermissions)
else
  echo "AVVISO: bypassPermissions non accettato su questa macchina — uso --permission-mode acceptEdits." >&2
  echo "        Servono regole permissions.allow in .claude/settings.local.json per git e test runner." >&2
  echo "        Per il bypass completo esegui una volta, in interattivo: claude --dangerously-skip-permissions (accetta il warning)." >&2
fi

echo ""
echo "Avvio Claude..."
cd "$PROJECT_DIR"
claude -p "$PROMPT" "${PERMISSION_ARGS[@]}"
