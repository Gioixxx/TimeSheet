# Timesheet

**Local-first time tracking desktop app** — traccia ore, clienti e attività senza cloud, senza abbonamenti.

Built with **Next.js 16 · Electron · Prisma · SQLite · Google Gemini AI**

---

## Features

- **Dashboard con statistiche** — ore totali, ore settimana corrente, voci registrate, clienti attivi
- **Registrazione rapida** — form con client, progetto, tag, tipo attività e durata
- **Input in linguaggio naturale (AI)** — scrivi `"2 ore di supporto al cliente Rossi ieri"` e Gemini compila il form automaticamente
- **Task board** — kanban leggero per gestire attività in corso
- **Vista calendario** — riepilogo mensile delle ore per giorno
- **Ricerca globale** — barra di ricerca con dropdown live su tutte le voci
- **Filtri** — per mese, tipo attività, cliente
- **Export CSV** — esporta il timesheet di qualsiasi mese con un click
- **Completamente locale** — database SQLite sul tuo disco, nessun dato inviato a server esterni (eccetto le chiamate AI opzionali)
- **Portable .exe** — distribuibile come singolo file Windows, senza installer

## Tipi di attività

| Tipo | Descrizione |
| ---- | ----------- |
| `SUPPORTO` | Ticket, helpdesk, assistenza clienti |
| `MANUTENZIONE` | Sviluppo, bugfix, attività tecniche |
| `PERMESSO` | Ore di permesso/congedo orario |
| `FERIE` | Giornate di ferie |

---

## Tech Stack

| Layer | Tecnologia |
| ----- | ---------- |
| UI | Next.js 16 + React 19 |
| Desktop | Electron 36 |
| Database | Prisma + SQLite |
| AI | Google Gemini (`gemini-2.5-flash`) |
| Form | React Hook Form + Zod |
| Icone | Lucide React |
| Packaging | electron-builder (portable x64) |

---

## Getting Started

### Prerequisiti

- Node.js 20+
- npm

### Installazione

```bash
git clone https://github.com/<tuo-utente>/timesheet.git
cd timesheet
npm install
```

### Configurazione

Crea un file `.env.local` nella root del progetto:

```env
# Percorso del database SQLite locale
DATABASE_URL="file:./prisma/dev.db"

# (Opzionale) Chiave API Gemini per l'input in linguaggio naturale
# Ottieni la tua su https://aistudio.google.com/apikey
GEMINI_API_KEY=your_api_key_here

# (Opzionale) Modello Gemini da usare (default: gemini-2.5-flash)
# GEMINI_MODEL=gemini-2.5-flash
```

### Inizializza il database

```bash
npx prisma migrate dev
```

### Avvio in modalità web (browser)

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### Avvio come app desktop (Electron)

```bash
# In un terminale: avvia Next.js
npm run dev

# In un altro terminale: avvia Electron
npm run electron
```

---

## Build

### App desktop portable (.exe per Windows)

```bash
npm run dist:win
```

L'eseguibile viene generato in `dist/`. Non richiede installazione — copia e avvia.

---

## Struttura del progetto

```text
timesheet/
├── electron/           # Main process Electron
├── prisma/
│   └── schema.prisma   # Schema DB (Client, Project, Tag, TimeEntry, Task)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── export/ # Endpoint CSV export
│   │   │   └── search/ # Endpoint ricerca globale
│   │   ├── calendario/ # Vista calendario mensile
│   │   └── page.tsx    # Dashboard principale
│   ├── components/     # Componenti React
│   └── lib/
│       ├── parse-nl-time-entry.ts  # Parser linguaggio naturale (Gemini)
│       ├── prisma.ts               # Client Prisma singleton
│       └── schemas.ts              # Schemi Zod
└── scripts/            # Script build/packaging
```

---

## Input AI — come funziona

Se configuri `GEMINI_API_KEY`, puoi descrivere la tua attività in italiano o inglese e l'AI compila automaticamente tutti i campi del form:

> *"Ho passato 3 ore a risolvere un bug critico sul progetto CRM per il cliente Rossi"*

Viene estratto automaticamente: titolo, durata, tipo attività (`MANUTENZIONE`), cliente e progetto.

L'AI usa il modello Gemini ed è completamente **opzionale** — l'app funziona perfettamente senza chiave API.

---

## Licenza

MIT
