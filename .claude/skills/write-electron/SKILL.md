---
name: write-electron
description: Writes production Electron main/renderer code matching the project conventions. Use when creating or editing IPC handlers, main-process services, preload scripts, or renderer files in an Electron project.
---
# Write Electron code

Wrapper procedurale. Non copiare le regole qui: leggi i moduli. Per Electron non esiste un file di snippet dedicato.

## Prima di scrivere

1. Segui `precise-code`.
2. Read `.claude/consoleclaude/stacks/electron.md` — sezione **Obbligatorie**.
3. Per UI renderer, Read `.claude/consoleclaude/stacks/component-libs.md` (se presente) e se serve `.claude/consoleclaude/snippets/nextjs-patterns.md` (se presente). Se il progetto usa Next.js o Prisma, Read le sezioni dedicate di `.claude/consoleclaude/stacks/electron-reference.md`.
4. Leggi 1–2 file nello stesso processo (main handler vs renderer).
5. Serve il codice per esteso di una sezione che il reference copre → Read `.claude/consoleclaude/stacks/electron-reference.md` (solo allora).

## Checklist (puntatori, non duplicati)

Applica le **Obbligatorie** del modulo stack: niente filesystem, database o segreti dal Renderer, isolamento (`contextIsolation`, `sandbox`, preload con `contextBridge`), IPC con `{ success, data?, error? }` e payload validato nel Main, niente SSR né route server nel Renderer.
