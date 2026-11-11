# Electron 44 — Reference
> **Revisione doc:** 2026-11

> Contiene il confine tra i processi, il codice di preload e di IPC nel main, l'elenco dell'hardening (solo le opzioni, senza codice), le regole per un Renderer in Next.js e per Prisma con SQLite, e i cambiamenti di Electron 44.

## Boundary processi

```text
Renderer (UI) -> preload (API sicura) -> main (Node/Electron) -> servizi locali
```

## Preload con API whitelisted

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopApi', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openFile: (path: string) => ipcRenderer.invoke('fs:openFile', path),
});
```

## Main process con IPC tipizzato

```typescript
ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('fs:openFile', async (_event, path: string) => {
  const content = await fs.promises.readFile(path, 'utf-8');
  return { path, content };
});
```

## Hardening minimo
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- CSP esplicita su renderer
- `will-navigate` e `setWindowOpenHandler` che negano di default; `shell.openExternal` solo con URL in allowlist
- Segreti salvati con `safeStorage`, nel Main

## Renderer con Next.js (static export)
- `next export` (static export) — niente SSR in Electron
- Route API Next.js **non funzionano** in modalità export — usa IPC
- `unoptimized: true` per immagini in `next.config.js`
- Struttura: `renderer/app/` (route file-based), `renderer/components/`, `renderer/hooks/` (hook che chiamano `window.electronAPI`)
- IPC dal Renderer: hook React con `window.electronAPI.resource.action(payload)` + React Query mutation
- Speech API: hook nel renderer con `window.SpeechRecognition`

## Prisma 7 con SQLite (nel Main)
- **Mai** accesso a Prisma dal Renderer: solo dal Main, dietro IPC
- `cuid()` per gli ID (`@id @default(cuid())`), non autoincrement; `@updatedAt` su ogni model
- Prisma 7 (client senza motore Rust): generator `prisma-client` con `output` obbligatorio, **driver adapter** obbligatorio (SQLite: `@prisma/adapter-better-sqlite3`), configurazione in `prisma.config.ts`, progetto ESM (`"type": "module"`), `.env` non più caricato da solo (`dotenv`), `prisma generate` e il seed non partono più dopo `migrate`; Node ≥ 20.19, TypeScript ≥ 5.4
- `better-sqlite3` è un modulo nativo: va ricompilato per la versione di Electron (`@electron/rebuild`)
- Migration con `npx prisma migrate dev --name <desc>` poi `npx prisma generate`; `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })` nel main process
- Schema in `prisma/schema.prisma`

## Cambiamenti di Electron 44 che toccano il codice
- Il modulo `clipboard` è stato riprogettato sul modello W3C (metodi asincroni, `ClipboardItem`): i renderer usano `navigator.clipboard`, non più l'accesso diretto
- macOS 12 non è più supportato (serve macOS 13+); non si pubblicano più build Windows 32 bit né Linux ARM 32 bit
- Novità utili: persistenza di posizione e dimensione delle finestre, `net.WebSocket`

## Vedi anche
- Stack base: `.claude/consoleclaude/stacks/electron.md`
- Component libs: `.claude/consoleclaude/stacks/component-libs.md`
