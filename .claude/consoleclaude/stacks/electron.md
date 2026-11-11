# Electron — Regole

> **Revisione doc:** 2026-11

## Obbligatorie
- Il Renderer gestisce solo la UI: **mai** filesystem, database, processi o segreti dal Renderer — tutto passa per IPC dal Main
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; il preload espone con `contextBridge` solo funzioni con nome, mai `ipcRenderer` intero
- IPC handlers con try/catch → ritorna `{ success, data?, error? }`; canali `risorsa:azione`
- Il Renderer non è fidato: ogni payload si valida nel Main (tipo, lunghezza, percorso dentro la cartella ammessa)
- Navigazione e finestre nuove chiuse di default (`will-navigate`, `setWindowOpenHandler`); `shell.openExternal` solo con URL in allowlist
- CSP esplicita sul Renderer, senza `unsafe-inline` né `unsafe-eval` negli script
- Chiavi API e segreti solo nel Main (`safeStorage` per salvarli), mai nel codice del Renderer
- Niente SSR né route server nel Renderer: è una pagina statica

## Dipendenze core
Electron 44 (2026-08-25: Chromium 152, Node 24; la 41 è fuori supporto) · IPC · preload con `contextBridge`

Un modulo nativo va ricompilato per la versione di Electron (`@electron/rebuild`). Un file che un processo esterno deve leggere non può stare dentro l'`asar` (`asarUnpack`).

## Struttura
```
main/
  handlers/             → IPC handlers (item.handler.ts, ...)
  services/             → filesystem, DB, AI, processi esterni
  index.ts              → Electron main entry
preload/
  index.ts              → contextBridge: l'API che il Renderer vede
renderer/               → la UI (pagina statica)
```

## Pattern chiave
- **IPC Main**: `ipcMain.handle('resource:action', async (_, payload) => { try { return { success: true, data } } catch { return { success: false, error } } })`
- **Preload**: `contextBridge.exposeInMainWorld('electronAPI', { resource: { action: (payload) => ipcRenderer.invoke('resource:action', payload) } })`
- **IPC Renderer**: `window.electronAPI.resource.action(payload)`, mai `require('electron')`
- **AI integration**: chiamata nel main process — mai esporre API key al renderer

## Con Next.js o Prisma → sezioni dedicate del reference (static export, Prisma 7 con SQLite)
## Architettura a strati (se il progetto ha un dominio) → `.claude/consoleclaude/arch/clean-arch.md`
## Reference → `.claude/consoleclaude/stacks/electron-reference.md`
