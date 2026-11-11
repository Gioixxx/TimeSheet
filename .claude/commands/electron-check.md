---
description: "Verifica convenzioni Electron"
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---
# /electron-check — Verifica convenzioni Electron

## Input
File corrente. `.claude/consoleclaude/stacks/electron.md`, `.claude/consoleclaude/snippets/nextjs-patterns.md` (se presente), `@.claude/memory/conventions.md`. Context7 (se disponibile) per electron.

## Regole
- Checklist: Main (no browser API, ipcMain centralizzati, database e file-system solo qui, payload validati), Preload (contextBridge namespaced, no segreti), Renderer (no import electron, solo API preload), IPC (tipi condivisi, nomi dominio:azione)
- Sicurezza: nodeIntegration false, contextIsolation true, sandbox true, navigazione e finestre nuove negate di default, CSP senza unsafe-inline
- Con Next.js o Prisma: anche le sezioni dedicate di `.claude/consoleclaude/stacks/electron-reference.md`
- ✅/⚠️/❌ per criterio

## Output
Checklist per contesto, punteggio X/Y
