#!/usr/bin/env bash
# Auto-generato da install-memory-hook.sh
# Risolve il path a memory-sync.sh e lo chiama in background.
LIBS_PATH="/c/Users/Gioix/.claude/claude-libs"
if [ -f "$HOME/.claude_libs_path" ]; then
  LIBS_PATH=$(tr -d '[:space:]' < "$HOME/.claude_libs_path")
fi
SYNC="$LIBS_PATH/scripts/memory/memory-sync.sh"
[ -f "$SYNC" ] && bash "$SYNC" "${1:-$(pwd)}" &
