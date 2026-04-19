#!/usr/bin/env bash
# ralph/ralph.sh — Loop autonomo di sviluppo (bash)
# Uso: bash ralph/ralph.sh <iterations> [project_dir]
# Esegue ralph-once.sh per N iterazioni o fino al completamento del PRD.

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations> [project_dir]"
  exit 1
fi

ITERATIONS="$1"
RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${2:-$(dirname "$RALPH_DIR")}"

echo "Ralph — Loop Autonomo"
echo "Progetto:   $PROJECT_DIR"
echo "Iterazioni: $ITERATIONS"
echo "=========================================="

for ((i=1; i<=ITERATIONS; i++)); do
  # Controlla stop.signal all'inizio di ogni iterazione — consumato e rimosso
  STOP_SIGNAL="$RALPH_DIR/stop.signal"
  if [ -f "$STOP_SIGNAL" ]; then
    rm "$STOP_SIGNAL"
    echo ""
    echo "🛑 Stop signal ricevuto — fermato prima dell'iterazione $i."
    echo "   Iterazioni completate: $((i - 1)) di $ITERATIONS"
    exit 0
  fi

  echo ""
  echo "Iterazione $i di $ITERATIONS"
  echo "--------------------------------"

  result=$(bash "$RALPH_DIR/ralph-once.sh" "$PROJECT_DIR" 2>&1)
  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo ""
    echo "✅ PRD COMPLETATO dopo $i iterazioni!"
    exit 0
  fi
done

echo ""
echo "⚠️  Completate $ITERATIONS iterazioni. Il PRD potrebbe non essere ancora finito."
echo "   Controlla ralph/prd.json per lo stato delle storie e riavvia se necessario."
