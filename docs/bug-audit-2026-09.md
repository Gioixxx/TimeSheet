# Audit bug — TimeSheet

**Data:** 2026-09-08
**Commit base:** `main` @ `04906d1`
**Metodo:** analisi statica dell'intero sorgente (`src/`, `electron/`, `prisma/`, `public/`, Docker, CI).
**Limite noto:** non è stato possibile eseguire `npm run build`, `lint` o test — vedi bug #1. Tutti i
riscontri sotto derivano da lettura del codice, non da esecuzione.

Legenda severità:

| | |
|---|---|
| **A** | Alta — impatto utente diretto o dato sbagliato |
| **M** | Media — comportamento errato in casi realistici |
| **B** | Bassa — edge case, robustezza, pulizia |

---

## Riepilogo

| # | Severità | Area | Problema |
|---|---|---|---|
| 1 | A | Tooling | Hook `.claude/settings.json` con path Windows assoluto: rompe il repo fuori dalla macchina dell'autore |
| 2 | A | Filtri | Filtro "Straordinario" nella home non filtra nulla |
| 3 | A | Date | "Oggi" calcolato in UTC nei form, in locale nelle pagine: voci sul giorno sbagliato dopo mezzanotte |
| 4 | A | Statistiche | "Questa settimana" parte da domenica in `/`, da lunedì in `/oggi`: due valori diversi per la stessa etichetta |
| 5 | A | PWA | Il service worker mette in cache pagine e API autenticate; restano leggibili dopo il logout |
| 6 | M | Reminder | Ricorrenza mensile sul giorno 29–31 slitta in modo permanente |
| 7 | M | Reminder | Completare un'occorrenza cancella l'intera serie ricorrente |
| 8 | M | Reminder | La lista mostra `scheduledAt` originale invece della prossima occorrenza |
| 9 | M | Email | `fetch('1:*')` scarica tutta la casella a ogni poll, non solo i messaggi non letti |
| 10 | M | Email | Deduplica e fetch basati su numero di sequenza IMAP: instabile, può saltare o incrociare messaggi |
| 11 | M | Statistiche | La stat "Clienti" mostra al massimo 20 |
| 12 | M | Sicurezza | Le Server Action non ricontrollano la sessione (unica difesa: `proxy.ts`) |
| 13 | M | PWA | `cache.addAll(['/'])` fallisce l'install del SW quando l'auth è attiva |
| 14 | M | React | `NotificationManager` può lasciare un `setInterval` orfano |
| 15 | B | Electron | Il guard anti-doppio-poll email non funziona in dev |
| 16 | B | Robustezza | `advanceByRecurrence` può ciclare all'infinito su una ricorrenza non valida |
| 17 | B | Validazione | Messaggio di errore sulla durata massima incoerente col limite reale |
| 18 | B | UX | Il parametro `?from=` del redirect di login è ignorato |
| 19 | B | UX | Flash del tema di default a ogni caricamento |
| 20 | B | Docker | Il container gira come `root` |

---

## Dettaglio

### 1 — Hook con path Windows assoluto rompe il repo altrove · **A**

`.claude/settings.json:9,19,29,39`

```json
"command": "python \"C:/Users/Gioix/.claude/claude-libs/scripts/hooks/guard.py\""
```

Tutti e quattro gli hook (`PreToolUse`, `SessionStart`, `PreCompact`, `SessionEnd`) puntano a un path
assoluto della macchina Windows dell'autore. Il file è versionato, quindi in **qualunque** altro
ambiente — sessione Claude Code web, CI, un secondo PC, un collaboratore — ogni hook fallisce.

`PreToolUse` con matcher `Read|Bash` è il più grave: blocca completamente gli strumenti Read e Bash.
In questa sessione ha impedito di eseguire `npm run build`, `npm run lint` e i comandi git; l'audit è
stato fatto leggendo i file via `grep`.

**Fix consigliato:** spostare i quattro hook in `.claude/settings.local.json` (non versionato), che è
la sede giusta per configurazione legata alla singola macchina. In alternativa, rendere il comando
tollerante all'assenza dello script.

> Non applicato: toccare gli hook di guardia dell'utente senza chiedere è fuori perimetro.

---

### 2 — Il filtro "Straordinario" non filtra · **A**

`src/app/page.tsx:53` vs `src/components/FilterBar.tsx:55`

```ts
// page.tsx — getData()
const validTypes = ['SUPPORTO', 'MANUTENZIONE', 'PERMESSO', 'FERIE']
if (filters.type && validTypes.includes(filters.type)) {
  where.activityType = filters.type as any
}
```

```tsx
// FilterBar.tsx
<option value="STRAORDINARIO">Straordinario</option>
```

`STRAORDINARIO` manca da `validTypes`. Selezionando "Straordinario" nella FilterBar:

- l'URL diventa `/?type=STRAORDINARIO`;
- la `<select>` mostra "Straordinario" come filtro attivo;
- **ma la lista mostra tutte le voci, non filtrate.**

Peggio: `MonthExportControls` propaga lo stesso `type` a `/api/export`, e la route di export
**include** `STRAORDINARIO` in `ACTIVITY_TYPES` (`src/app/api/export/route.ts:8-14`). Quindi il CSV
scaricato è filtrato correttamente mentre la lista a schermo no — schermo ed export divergono con lo
stesso filtro impostato.

**Fix:** aggiungere `'STRAORDINARIO'` a `validTypes`. Meglio ancora, derivare la lista da
`activityTypeSchema.options` in `src/lib/schemas.ts` così non può più divergere.

---

### 3 — "Oggi" in UTC nei form, in locale nelle pagine · **A**

`src/components/TimeEntryForm.tsx:71,142` e `src/components/TaskCard.tsx:32`

```ts
const today = new Date().toISOString().split('T')[0]   // ← data UTC
```

`toISOString()` restituisce la data **UTC**. In Italia (UTC+1/+2), tra mezzanotte e le 01:00/02:00
locali la data UTC è ancora **il giorno prima**.

Conseguenza concreta, alle 00:30 del 9 settembre:

- `Navbar.tsx:26` usa `now.getDate()` (locale) → intestazione "Martedì 9 Settembre";
- `TimeEntryForm` precompila il campo Data con **2026-09-08**;
- l'utente salva senza accorgersene → la voce finisce sull'8;
- `/oggi` filtra su mezzanotte **locale** (`oggi/page.tsx:48-49`) → la voce appena creata **non
  compare** in "Voci di oggi".

Stessa cosa in `TaskCard` quando si logga un task come voce.

Il resto del codice è coerente su UTC (storage a mezzanotte UTC, `export-data.ts`, `calendario/`);
gli outlier sono questi due `toISOString()` e le finestre locali di `/oggi`.

**Fix:** una sola helper condivisa, es.

```ts
export function todayLocalIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
```

e usarla in `TimeEntryForm` e `TaskCard`.

> Nota: `/oggi` con finestra locale è corretto solo per offset UTC positivi. A UTC−5 la finestra
> `[08 05:00Z, 09 05:00Z)` esclude la voce dell'8 (salvata a `08T00:00Z`) e include quella del 9 —
> "Voci di oggi" sarebbe sfasata di un giorno intero. Latente in Italia, ma è la stessa incoerenza
> di fondo.

---

### 4 — "Questa settimana" calcolata in due modi diversi · **A**

```ts
// src/app/page.tsx:18 — settimana che parte da DOMENICA
startOfWeek.setDate(now.getDate() - now.getDay())

// src/app/oggi/page.tsx:53 — settimana che parte da LUNEDÌ
startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7))
```

Le due pagine mostrano una card con la stessa etichetta "Questa settimana" e valori diversi ogni
volta che esiste una voce di domenica. `/` è quella sbagliata: in Italia la settimana inizia di
lunedì, e il resto dell'app usa ISO (`calendario/page.tsx:26` → `(getUTCDay() + 6) % 7`).

**Fix:** allineare `page.tsx` alla formula ISO, idealmente estraendo `startOfWeek()` in `src/lib/`.

---

### 5 — Il service worker cachea pagine e API autenticate · **A**

`public/sw.js:21-35`

```js
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !response.redirected) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
```

Ogni GET con esito 200 finisce in Cache Storage — comprese le pagine HTML renderizzate con i dati
dell'utente e le risposte di `/api/search`, `/api/reminders/upcoming`, `/api/export`.

Due conseguenze:

1. **Dati leggibili dopo il logout.** La cache non viene svuotata al logout. Dopo `deleteSession()`,
   se la rete cade (o in modalità offline) il ramo `.catch()` serve la pagina autenticata dalla
   cache. Il contenuto resta comunque nel profilo browser a tempo indefinito.
2. Rilevante perché l'istanza CasaOS è **esposta su internet senza TLS** — su una macchina condivisa
   la cache è materiale recuperabile.

Il controllo `!response.redirected` intercetta il redirect al login, quindi una consapevolezza c'è,
ma non copre la lettura post-logout.

**Fix:** non cachare `/api/*` né i documenti di navigazione; limitare la cache al guscio statico. E
svuotare Cache Storage al logout.

---

### 6 — Ricorrenza mensile sul giorno 29–31 slitta · **M**

`src/lib/reminder-recurrence.ts:20-22`

```ts
case 'MONTHLY':
  d.setMonth(d.getMonth() + 1)
  break
```

`setMonth` non satura al fine mese: **31 gennaio** → `setMonth(1)` → 31 febbraio → JavaScript
normalizza a **3 marzo**. E la deriva è permanente, perché l'occorrenza successiva parte dalla data
già slittata: 3 aprile, 3 maggio, …

Stesso schema in `YEARLY` per il 29 febbraio → 1 marzo.

**Fix:** ancorare al giorno del mese originale e saturare all'ultimo giorno disponibile:

```ts
case 'MONTHLY': {
  const target = date.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(target, lastDay))
  break
}
```

---

### 7 — Completare un'occorrenza cancella la serie · **M**

`src/app/actions.ts:228-236`

```ts
export async function completeReminder(id: string) {
  await prisma.reminder.update({ where: { id }, data: { isCompleted: true } })
  ...
}
```

`isCompleted` è un flag sull'intero record. Su un reminder `DAILY`, spuntare l'occorrenza di oggi lo
rimuove da `/api/reminders/upcoming`, da `ReminderList` e dal calendario — **per sempre**. Non esiste
un concetto di "occorrenza completata".

**Fix:** per i ricorrenti, far avanzare `notifiedAt` all'occorrenza corrente invece di impostare
`isCompleted`; riservare `isCompleted` ai non ricorrenti (o all'intera serie, con un'azione distinta
e un'etichetta esplicita).

---

### 8 — La lista reminder mostra la data originale, non la prossima occorrenza · **M**

`src/components/ReminderList.tsx:35-38,60,78`

`ReminderList` legge `scheduledAt` grezzo e non chiama mai `nextOccurrence()`. Un reminder `DAILY`
creato tre settimane fa continua a mostrare "⚠ 18 ago 09:00" invece di "oggi 09:00", ed è marcato
come scaduto in permanenza. Sia `/api/reminders/upcoming` sia il calendario calcolano invece
correttamente l'occorrenza.

**Fix:** usare `nextOccurrence(r)` per la data mostrata e per il flag `isPast`, e ordinare su quella.

---

### 9 — Il poll email scarica tutta la casella · **M**

`src/lib/email-poller.ts:56-61`

```ts
// Fetch all UNSEEN messages
const messages = client.fetch('1:*', { envelope: true, ... }, { uid: false })
```

Il commento dice UNSEEN, il codice dice `1:*` — **tutti** i messaggi della mailbox, senza criterio di
ricerca. A ogni poll (ogni 5 minuti) il ciclo scorre l'intera casella e per **ogni** messaggio esegue
una `prisma.processedEmail.findUnique`. Su una INBOX da qualche migliaio di messaggi sono migliaia di
query ogni 5 minuti — su un Raspberry Pi si sente.

Funziona solo grazie alla deduplica su `ProcessedEmail`, che maschera il problema.

**Fix:** `client.search({ seen: false })` e fetch dei soli UID risultanti.

---

### 10 — Deduplica e fetch basati sul numero di sequenza IMAP · **M**

`src/lib/email-poller.ts:61,66,83,100,144`

Tre problemi collegati, tutti dovuti a `{ uid: false }`:

1. **Chiave di dedup instabile** (riga 66): quando manca `Message-ID` si ripiega su
   `` `seq-${msg.seq}` ``. I numeri di sequenza sono *posizionali* e si rinumerano a ogni
   cancellazione. Un messaggio nuovo può ereditare un `seq-N` già presente in `ProcessedEmail` e
   venire **saltato senza essere mai processato**.
2. **Race tra le due fasi** (righe 83 → 100): la fase 1 raccoglie i `seq`, la fase 2 fa
   `fetchOne(seq)`. Se nel frattempo un messaggio viene espunto, tutti i `seq` successivi scalano di
   uno e il corpo recuperato appartiene a **un altro messaggio** rispetto al `messageId` registrato.
3. Stessa esposizione per `messageFlagsAdd(seq, ['\\Seen'])` alla riga 144: può marcare come letto il
   messaggio sbagliato.

**Fix:** usare gli UID (`{ uid: true }`), stabili per definizione all'interno di una mailbox.

---

### 11 — La stat "Clienti" è troncata a 20 · **M**

`src/app/page.tsx:71-74,137`

```ts
prisma.client.findMany({ take: SUGGESTIONS_LIMIT, orderBy: { entries: { _count: 'desc' } } })
...
<p className={styles.statValue}>{clients.length}</p>
```

`clients` è la lista dei suggerimenti per il form, limitata a `SUGGESTIONS_LIMIT = 20`. Viene però
riusata come conteggio nella card "Clienti", che quindi si blocca a 20 anche con 50 clienti a
sistema.

**Fix:** una `prisma.client.count()` dedicata in `getStats()`.

---

### 12 — Le Server Action non ricontrollano la sessione · **M**

`src/app/actions.ts` (tutte le action) e `src/lib/auth-actions.ts`

Tutte e cinque le route in `src/app/api/` chiamano `requireApiAuth()`. **Nessuna** delle 13 Server
Action in `src/app/actions.ts` chiama `verifySession()` o equivalente — `createTimeEntry`,
`updateTimeEntry`, `deleteTimeEntry`, `createTask`, `deleteTask`, `updateTask`, `logTaskAsEntry`, le
quattro dei reminder, `triggerEmailPoll`, `parseNaturalLanguageTimeEntry`.

Le Server Action arrivano come POST sul path della pagina, quindi **oggi `proxy.ts` le copre**: il
matcher esclude solo asset statici. Non è una vulnerabilità sfruttabile allo stato attuale.

È però l'unico strato di difesa, e la documentazione Next.js sconsiglia esplicitamente di affidare
l'autorizzazione al solo middleware (cfr. CVE-2025-29927 sul bypass via header; Next 16.2.2 è
patchato, ma il pattern resta fragile). Il DAL esiste già ed è usato ovunque tranne qui: è
un'asimmetria, non una scelta.

Nota minore correlata: `updateTask` (`actions.ts:132-138`) passa `data` direttamente a Prisma senza
`taskSchema.parse()` — l'unica action che salta la validazione runtime.

**Fix:** una riga `await verifySession()` in testa a ogni action.

---

### 13 — `cache.addAll(['/'])` fallisce l'install del SW con auth attiva · **M**

`public/sw.js:3-10`

In install il SW pre-cachea `/`. Con `AUTH_ENABLED=true` e nessuna sessione, `/` risponde con un
redirect a `/login`; `cache.addAll` rifiuta le risposte redirected con `TypeError`, la promise di
`waitUntil` viene rigettata e **l'installazione del service worker fallisce**. Sull'istanza Docker
esposta il SW non si attiva mai al primo caricamento.

**Fix:** rimuovere il precache di `/`, oppure racchiudere `addAll` in un `.catch(() => {})`.

---

### 14 — `setInterval` orfano in `NotificationManager` · **M**

`src/components/NotificationManager.tsx:82-88`

```ts
let intervalId: ReturnType<typeof setInterval> | undefined
requestAndPoll().then((id) => { intervalId = id })

return () => {
  if (intervalId !== undefined) clearInterval(intervalId)
}
```

`requestAndPoll` è asincrona e al suo interno attende `Notification.requestPermission()`, che resta
in sospeso finché l'utente non risponde al prompt del browser. Se il componente si smonta prima —
navigazione, oppure il doppio mount di StrictMode in dev — la cleanup gira con `intervalId ===
undefined`, non pulisce nulla, e subito dopo la `.then` assegna un interval che **nessuno chiuderà
più**. Il polling verso `/api/reminders/upcoming` continua per tutta la vita della pagina, e può
accumularsi.

**Fix:** flag `cancelled` nella closure, oppure `AbortController`; assegnare l'interval a una ref e
pulire incondizionatamente.

---

### 15 — Doppio poll email in sviluppo · **B**

`src/instrumentation.ts:5` e `electron/main.cjs:224-231,294-305`

```ts
// instrumentation.ts
// In Electron il polling è già gestito dal loop nativo in electron/main.cjs
if (process.env.ELECTRON_RUN_AS_NODE) return
```

Il guard funziona in produzione, dove `startServer` imposta `ELECTRON_RUN_AS_NODE: "1"`
(`main.cjs:243`). Nel ramo **dev** (`!app.isPackaged`, righe 224-231) Electron lancia `npm run dev`
**senza** quella variabile, ma continua a chiamare `/api/email-poll` ogni 5 minuti (riga 305).
Risultato: in sviluppo il polling gira due volte, esattamente ciò che il commento dichiara di evitare.

Minore ma correlato: `setInterval(pollEmail, ...)` (riga 305) non viene mai fermato in `before-quit`,
a differenza di `reminderPollInterval`.

---

### 16 — Possibile ciclo infinito su ricorrenza non valida · **B**

`src/lib/reminder-recurrence.ts:11-28,48,79`

```ts
const rule = r.recurrence as RecurrenceRule | null   // cast senza validazione
```

`Reminder.recurrence` è una `String` libera a schema (`prisma/schema.prisma:94`). Lo `switch` in
`advanceByRecurrence` non ha `default`: con un valore fuori dai quattro previsti la funzione
restituisce la data **invariata**, e i due `while` in `nextOccurrence` (riga 48) e
`getOccurrencesInRange` (riga 79) non terminano mai.

Oggi i valori sono vincolati dallo zod enum in `createReminder`/`updateReminder`, quindi non è
raggiungibile dall'app. Ma basterebbe una scrittura diretta su SQLite o una migrazione futura per
appendere il rendering del calendario, che itera su **tutti** i reminder.

**Fix:** `default: return date` è insufficiente (ciclerebbe comunque); validare `rule` in ingresso e
trattare un valore ignoto come non ricorrente.

---

### 17 — Messaggio di errore incoerente sulla durata massima · **B**

`src/lib/schemas.ts:13`

```ts
.max(14400, 'Massimo 30 giorni')
```

14400 minuti = 240 ore = **10 giorni**, non 30. Il messaggio mostrato all'utente è sbagliato (o il
limite lo è).

---

### 18 — Il parametro `?from=` del login è ignorato · **B**

`src/proxy.ts:17-19` vs `src/lib/auth-actions.ts:58`

`proxy.ts` costruisce diligentemente `/login?from=<pathname>`, ma `LoginForm` non legge mai il
parametro e `login()` fa sempre `redirect('/')`. L'utente che apre un link diretto a
`/calendario/2026-09-08` viene rimandato in home dopo l'accesso.

Funzionalità incompiuta, non un difetto di sicurezza — e se la si completa, va validato che `from`
sia un path relativo, per non introdurre un open redirect.

---

### 19 — Flash del tema di default · **B**

`src/components/ThemeProvider.tsx:16-26`

Lo stato parte da `DEFAULT_THEME_ID` e il tema salvato viene letto da `localStorage` dentro
`useEffect`, cioè **dopo** l'idratazione. Chi usa un tema non di default vede un lampo del tema
chiaro/di default a ogni caricamento.

**Fix:** uno script inline in `<head>` che applica le CSS variables da `localStorage` prima della
prima pittura.

---

### 20 — Il container gira come root · **B**

`Dockerfile:23-41`

Lo stage `runner` non ha `USER`: `node server.js` gira come root. Per un container **esposto su
internet senza TLS** è una difesa in meno a costo quasi nullo.

**Fix:** `USER node` (o un utente dedicato) dopo le `COPY`, previa `chown` di `/app` e `/data`.

---

## Punti verificati e risultati corretti

Per completezza, cose controllate che **non** sono bug:

- `verifyPassword` (`src/lib/password.ts`) usa `scrypt` + `timingSafeEqual` con controllo di
  lunghezza preventivo — corretto.
- `AUTH_SECRET: ${AUTH_SECRET:-}` in `docker-compose.yml` produce stringa vuota, che è *falsy*:
  `getAuthSecret()` ricade correttamente sul file persistente in `/data/.auth-secret`.
- Le date di storage (mezzanotte UTC), `export-data.ts`, `page.tsx` (filtro mese) e tutto
  `calendario/` sono coerentemente in UTC.
- `datasetToCsv`: la riga `TOTALE` ha 5 campi, allineati alle 5 colonne di `summaryHeader`.
- L'`ENTRYPOINT` del Dockerfile: l'associatività di `&&`/`||` produce il comportamento voluto in
  entrambi i rami (successo ed errore della migrazione).
- `nextOccurrence` + `/api/reminders/[id]/notified`: il ciclo notifica/avanzamento è corretto sia per
  i reminder singoli sia per i ricorrenti.
- Tutti i CSS module importati esistono.
- `docker/metadata-action` normalizza in minuscolo `Gioixxx/TimeSheet`, coerente con il riferimento
  `ghcr.io/gioixxx/timesheet:latest` in `docker-compose.yml`.

---

## Ordine di intervento suggerito

1. **#1** — sblocca tooling e test per chiunque non sia sulla macchina dell'autore.
2. **#2, #4, #11** — bug di correttezza dei dati mostrati, fix di poche righe l'uno.
3. **#3** — una helper condivisa per "oggi"; tocca due componenti.
4. **#5, #13** — service worker; conviene rivederlo in un colpo solo.
5. **#6, #7, #8** — semantica delle ricorrenze; da affrontare come blocco unico.
6. **#9, #10** — passaggio del poller agli UID + `search({ seen: false })`.
7. Il resto a scelta.
