# Backlog

Funzionalità, miglioramenti e idee a lungo termine non ancora pianificate in uno sprint.
Alimentato durante le sessioni e le retrospettive. Prioritizzato prima di ogni nuovo sprint.

---

<!-- TEMPLATE PER NUOVO ITEM:

### [Titolo breve — cosa si vuole fare]
**Priorità:** Alta / Media / Bassa
**Tipo:** Feature / Miglioramento / Refactor / Bug / Tech debt
**Area:** [modulo o dominio coinvolto]
**Data aggiunta:** YYYY-MM-DD
**Descrizione:** [cosa si vuole ottenere e perché ha valore]
**Criteri di accettazione:** [come capire che è fatto]
**Dipendenze:** [prerequisiti o blocchi noti]
**Stima:** Piccola / Media / Grande

-->

## Alta priorità

<!-- Item che andrebbero nello sprint successivo -->

## Media priorità

<!-- Item importanti ma non urgenti -->

### Cambio password dall'app
**Priorità:** Media
**Tipo:** Feature
**Area:** Autenticazione (`/setup`, `/login`, `src/lib/auth-actions.ts`)
**Data aggiunta:** 2026-07-16
**Descrizione:** Al momento l'unico modo per cambiare/reimpostare la password è cancellare la riga `User` dal DB (che riattiva `/setup`). Aggiungere una pagina "Account" con cambio password (richiede la password attuale) eviterebbe di dover intervenire sul DB.
**Criteri di accettazione:** Form protetto da sessione valida, richiede password attuale, aggiorna `passwordHash`.
**Dipendenze:** nessuna
**Stima:** Piccola

### Auth check nei singoli Server Action (defense-in-depth)
**Priorità:** Media
**Tipo:** Tech debt
**Area:** `src/app/actions.ts` e le altre server action nei componenti (TaskBoard, ReminderForm, DeleteButton, EditButton, ecc.)
**Data aggiunta:** 2026-07-16
**Descrizione:** La protezione attuale si basa su `src/proxy.ts` (verifica ottimistica del cookie su ogni richiesta/navigazione, incluse le Server Action che condividono il path della pagina protetta) più `requireApiAuth()` sui Route Handler standalone sotto `src/app/api/*`. La guida ufficiale Next.js consiglia comunque di verificare la sessione anche dentro ogni Server Action (tramite una DAL come `verifySession()` in `src/lib/dal.ts`), perché il proxy da solo non è garantito coprire ogni caso (es. refactor futuri che spostano una action su un path escluso dal matcher).
**Perché rimandato:** Per un'app personal single-user il rischio residuo è basso e il proxy copre già il percorso reale di attacco (accesso diretto all'app esposta su internet); retrofittare `verifySession()` in tutte le action esistenti è un cambio ampio rimandato a una sessione dedicata.
**Impatto attuale:** Rischio basso, ma da tenere presente se in futuro si aggiungono più utenti o dati più sensibili.
**Risoluzione suggerita:** Richiamare `verifySession()` da `src/lib/dal.ts` in cima a ogni Server Action che mutano dati.

## Bassa priorità

<!-- Idee, nice-to-have, ottimizzazioni future -->

---

## Archiviato

<!-- Item passati in sprint o scartati — con data e motivazione -->