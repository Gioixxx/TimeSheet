<div align="center">

# ⏱ TimeSheet

**App desktop locale per il tracciamento delle ore lavorative — zero cloud, zero abbonamenti.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Electron](https://img.shields.io/badge/Electron-36-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Funzionalità

- **Dashboard con statistiche** — ore totali, ore settimana corrente, voci registrate, clienti attivi
- **Registrazione rapida** — form con cliente, progetto, tag, tipo attività e durata
- **Input in linguaggio naturale (AI)** — scrivi `"2 ore di supporto al cliente Rossi ieri"` e l'AI compila il form automaticamente
- **Task board** — kanban leggero per gestire attività in corso
- **Vista calendario** — riepilogo mensile delle ore per giorno
- **Ricerca globale** — barra di ricerca con dropdown live su tutte le voci
- **Filtri** — per mese, tipo attività, cliente
- **Export CSV** — esporta il timesheet di qualsiasi mese con un click
- **Automazione via email** — polling IMAP per convertire email in voci di timesheet
- **100% locale** — database SQLite sul tuo disco; anche l'AI opzionale gira su un gateway self-hosted nella tua rete locale, nessun dato inviato a servizi cloud di terze parti
- **Portable .exe** — distribuibile come singolo file Windows, senza installer

## Tipi di attività

| Tipo | Descrizione |
| ---- | ----------- |
| `SUPPORTO` | Ticket, helpdesk, assistenza clienti |
| `MANUTENZIONE` | Sviluppo, bugfix, attività tecniche |
| `PERMESSO` | Ore di permesso/congedo orario |
| `FERIE` | Giornate di ferie |

## Tech Stack

| Layer | Tecnologia |
| ----- | ---------- |
| UI | Next.js 16 + React 19 |
| Desktop | Electron 36 |
| Database | Prisma 6 + SQLite |
| AI | iAPi — gateway self-hosted su Ollama (`llama3.2:3b`) |
| Form | React Hook Form + Zod |
| Icone | Lucide React |
| Packaging | electron-builder (portable x64) |

## Quick Start

```bash
git clone https://github.com/Gioix/timesheet.git
cd timesheet
npm install
npx prisma migrate dev
npm run electron
```

> Per avviare solo il server web (senza Electron): `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Configurazione

Crea un file `.env.local` nella root del progetto:

```env
# Percorso del database SQLite locale
DATABASE_URL="file:./prisma/dev.db"

# (Opzionale) URL del gateway AI locale (iAPi) per l'input in linguaggio naturale
# Es. http://<ip-pi-lan>:8000 se in esecuzione su un Raspberry Pi nella tua LAN
IAPI_BASE_URL=http://<ip-pi-lan>:8000

# (Opzionale) Chiave API per il gateway iAPi (riservata per autenticazione futura)
# IAPI_API_KEY=
```

## Build — .exe portabile per Windows

```bash
npm run dist:win
```

L'eseguibile viene generato in `dist/`. Non richiede installazione — copia e avvia.

## Struttura del progetto

```text
timesheet/
├── electron/           # Main process Electron
├── prisma/
│   └── schema.prisma   # Schema DB (Client, Project, Tag, TimeEntry, Task)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── export/     # Endpoint CSV export
│   │   │   └── search/     # Endpoint ricerca globale
│   │   ├── calendario/     # Vista calendario mensile
│   │   ├── oggi/           # Vista giornaliera
│   │   └── page.tsx        # Dashboard principale
│   ├── components/         # Componenti React
│   └── lib/
│       ├── parse-nl-time-entry.ts  # Parser linguaggio naturale (iAPi)
│       ├── prisma.ts               # Client Prisma singleton
│       └── schemas.ts              # Schemi Zod
└── scripts/                # Script build/packaging
```

## Come funziona l'input AI

Se configuri `IAPI_BASE_URL`, puoi descrivere l'attività in italiano o inglese e l'AI compila automaticamente tutti i campi del form:

> *"Ho passato 3 ore a risolvere un bug critico sul progetto CRM per il cliente Rossi"*

Vengono estratti automaticamente: titolo, durata, tipo attività (`MANUTENZIONE`), cliente e progetto. L'elaborazione avviene su un modello locale di piccole dimensioni (self-hosted, non cloud): può essere leggermente meno preciso di un modello cloud di grandi dimensioni, ma i dati non lasciano mai la rete locale. La funzione è completamente **opzionale** — l'app funziona senza un gateway AI configurato.

## Contribuire

Vedi [CONTRIBUTING.md](CONTRIBUTING.md).

## Licenza

[MIT](LICENSE) © 2025 Gioix

---

<div align="center">

# ⏱ TimeSheet

**Lightweight local-first desktop app for tracking work hours — no cloud, no subscriptions.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Electron](https://img.shields.io/badge/Electron-36-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

## Features

- **Dashboard with stats** — total hours, current week hours, entry count, active clients
- **Quick entry form** — client, project, tags, activity type, and duration
- **Natural language input (AI)** — type `"2 hours of support for client Rossi yesterday"` and the AI fills in the form automatically
- **Task board** — lightweight kanban for managing ongoing work
- **Calendar view** — monthly overview of hours per day
- **Global search** — live dropdown search across all entries
- **Filters** — by month, activity type, client
- **CSV export** — export any month's timesheet with one click
- **Email automation** — IMAP polling to convert emails into timesheet entries
- **100% local** — SQLite database on your disk; even the optional AI runs on a self-hosted gateway on your local network, no data sent to third-party cloud services
- **Portable .exe** — single Windows executable, no installer required

## Activity Types

| Type | Description |
| ---- | ----------- |
| `SUPPORTO` | Tickets, helpdesk, client support |
| `MANUTENZIONE` | Development, bugfixes, technical work |
| `PERMESSO` | Paid time off (hourly) |
| `FERIE` | Vacation days |

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| UI | Next.js 16 + React 19 |
| Desktop | Electron 36 |
| Database | Prisma 6 + SQLite |
| AI | iAPi — self-hosted gateway over Ollama (`llama3.2:3b`) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Packaging | electron-builder (portable x64) |

## Quick Start

```bash
git clone https://github.com/Gioix/timesheet.git
cd timesheet
npm install
npx prisma migrate dev
npm run electron
```

> To run as a web app only (no Electron): `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Configuration

Create a `.env.local` file in the project root:

```env
# Local SQLite database path
DATABASE_URL="file:./prisma/dev.db"

# (Optional) Local AI gateway (iAPi) URL for natural language input
# E.g. http://<pi-lan-ip>:8000 if running on a Raspberry Pi on your LAN
IAPI_BASE_URL=http://<pi-lan-ip>:8000

# (Optional) API key for the iAPi gateway (reserved for future auth)
# IAPI_API_KEY=
```

## Build — Portable Windows .exe

```bash
npm run dist:win
```

The executable is generated in `dist/`. No installation required — copy and run.

## How AI Input Works

With `IAPI_BASE_URL` configured, describe your activity in plain text and the AI auto-fills all form fields:

> *"Spent 3 hours fixing a critical bug on the CRM project for client Rossi"*

Automatically extracted: title, duration, activity type (`MANUTENZIONE`), client, and project. Inference runs on a small self-hosted local model (not cloud): it may be slightly less accurate than a large cloud model, but your data never leaves your local network. Completely **optional** — the app works without an AI gateway configured.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2025 Gioix
