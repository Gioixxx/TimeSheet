#!/usr/bin/env bash
# Schedula l'avvio automatico giornaliero di Ralph via cron (Linux/macOS).
#
# Registra/aggiorna/rimuove una voce crontab che lancia ralph/ralph.ps1 in modo NON presidiato
# a un orario fisso ogni giorno. Per evitare il prompt interattivo del runner, passa -Runner
# esplicito. Ralph è PowerShell-only → richiede 'pwsh' (PowerShell Core).
#
# Esempi:
#   scripts/schedule-ralph.sh --project ~/dev/my-app --time 02:00 --iterations 15
#   scripts/schedule-ralph.sh --project ~/dev/my-app --time 02:00 --dry-run
#   scripts/schedule-ralph.sh --project ~/dev/my-app --list
#   scripts/schedule-ralph.sh --project ~/dev/my-app --remove
#
# Prerequisiti: 'claude' autenticato e in PATH nell'ambiente cron; 'pwsh' installato.
# Nota macOS: cron funziona; launchd è l'alternativa "nativa" (non gestita da questo script).
set -euo pipefail

PROJECT="" ; TIME="02:00" ; ITERATIONS=10 ; RUNNER="claude" ; CURSOR_MODEL=""
LIBS="" ; NAME="" ; ACTION="install"

usage() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//' | sed '/^!/d'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --project)     PROJECT="$2"; shift 2 ;;
    --time)        TIME="$2"; shift 2 ;;
    --iterations)  ITERATIONS="$2"; shift 2 ;;
    --runner)      RUNNER="$2"; shift 2 ;;
    --cursor-model) CURSOR_MODEL="$2"; shift 2 ;;
    --libs)        LIBS="$2"; shift 2 ;;
    --name)        NAME="$2"; shift 2 ;;
    --remove)      ACTION="remove"; shift ;;
    --list)        ACTION="list"; shift ;;
    --dry-run)     ACTION="dry-run"; shift ;;
    -h|--help)     usage 0 ;;
    *) echo "Argomento sconosciuto: $1" >&2; usage 1 ;;
  esac
done

[ -n "$PROJECT" ] || { echo "ERRORE: --project è obbligatorio." >&2; exit 1; }
PROJECT="$(cd "$PROJECT" && pwd)"   # assoluto e validato

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLONE_ROOT="$(dirname "$SCRIPT_DIR")"
RALPH_PS1="$CLONE_ROOT/ralph/ralph.ps1"

[ -n "$NAME" ] || NAME="ralph-daily-$(basename "$PROJECT")"
TAG="# ralph-schedule:$NAME"

# ── --list / --remove (non richiedono validazioni d'install) ──────────────────
if [ "$ACTION" = "list" ]; then
  if crontab -l 2>/dev/null | grep -F "$TAG" ; then :; else echo "Nessuna voce cron '$NAME'."; fi
  exit 0
fi

if [ "$ACTION" = "remove" ]; then
  if crontab -l 2>/dev/null | grep -qF "$TAG"; then
    crontab -l 2>/dev/null | grep -vF "$TAG" | crontab -
    echo "🗑️  Voce cron '$NAME' rimossa."
  else
    echo "Nessuna voce cron '$NAME' da rimuovere."
  fi
  exit 0
fi

# ── Validazioni install / dry-run ─────────────────────────────────────────────
[ -f "$RALPH_PS1" ] || { echo "ERRORE: ralph.ps1 non trovato in '$RALPH_PS1'." >&2; exit 1; }
command -v pwsh >/dev/null 2>&1 || { echo "ERRORE: 'pwsh' (PowerShell Core) non trovato in PATH: Ralph è PowerShell-only." >&2; exit 1; }

case "$TIME" in
  [0-2][0-9]:[0-5][0-9]) : ;;
  *) echo "ERRORE: orario non valido '$TIME'. Usa HH:MM (es. 02:00)." >&2; exit 1 ;;
esac
HOUR=$((10#${TIME%%:*}))
MIN=$((10#${TIME##*:}))
[ "$HOUR" -le 23 ] || { echo "ERRORE: ora fuori range in '$TIME'." >&2; exit 1; }

# Path libs: --libs, poi env, poi file, poi root del clone.
if [ -n "$LIBS" ] && [ -d "$LIBS" ]; then
  LIBS="$(cd "$LIBS" && pwd)"
elif [ -n "${CLAUDE_LIBS_PATH:-}" ] && [ -d "${CLAUDE_LIBS_PATH}" ]; then
  LIBS="$CLAUDE_LIBS_PATH"
elif [ -f "$HOME/.claude_libs_path" ]; then
  LIBS="$(tr -d '\r\n' < "$HOME/.claude_libs_path")"
else
  LIBS="$CLONE_ROOT"
fi

LOG_DIR="$PROJECT/ralph/logs"
LOG_FILE="$LOG_DIR/ralph-scheduled.log"

CMD="cd '$PROJECT' && pwsh -NoProfile -File '$RALPH_PS1' -Iterations $ITERATIONS -ProjectDir '$PROJECT' -Runner $RUNNER -ClaudeLibsPath '$LIBS'"
if [ "$RUNNER" = "cursor" ] && [ -n "$CURSOR_MODEL" ]; then
  CMD="$CMD -CursorModel '$CURSOR_MODEL'"
fi
CRON_LINE="$MIN $HOUR * * * $CMD >> '$LOG_FILE' 2>&1 $TAG"

if [ "$ACTION" = "dry-run" ]; then
  echo "── DRY RUN (crontab non modificato) ─────────────────"
  echo "Nome:    $NAME"
  echo "Quando:  ogni giorno alle $TIME"
  echo "Log:     $LOG_FILE"
  echo "Cron:    $CRON_LINE"
  exit 0
fi

mkdir -p "$LOG_DIR"
# Idempotente: rimuovi l'eventuale voce esistente con lo stesso tag, poi aggiungi la nuova.
{ crontab -l 2>/dev/null | grep -vF "$TAG" || true; echo "$CRON_LINE"; } | crontab -

echo "✅ Voce cron '$NAME' registrata: ogni giorno alle $TIME → ralph.ps1 -Iterations $ITERATIONS"
echo "   Progetto: $PROJECT"
echo "   Log:      $LOG_FILE"
echo "   Lista:    scripts/schedule-ralph.sh --project '$PROJECT' --list"
echo "   Rimuovi:  scripts/schedule-ralph.sh --project '$PROJECT' --remove"
