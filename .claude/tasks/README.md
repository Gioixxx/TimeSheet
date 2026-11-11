# Task del progetto

Un file per task: `T-0001.md`, `T-0002.md`, … in questa cartella. La console li mostra e li ordina; i Dot li leggono per sapere cosa c'è da fare. Gli altri file di questa cartella (compreso questo) si ignorano; i task tolti dalla board stanno nella sottocartella `archivio/`.

## Formato

```markdown
---
id: T-0042
titolo: "Timeout sulla POST del prompt"
stato: da-fare
priorita: alta
area: pagina
posizione: m
creato: 2026-10-22T10:00:00.000Z
aggiornato: 2026-10-22T10:00:00.000Z
legami: ["tech-debt:api-timeout", "ramo:feat/x"]
---

Descrizione libera: cosa serve, criteri di accettazione, note.
```

| Campo | Valori |
|---|---|
| `id` | `T-` e da 4 a 6 cifre; è anche il nome del file |
| `titolo` | una riga, al massimo 200 caratteri |
| `stato` | `backlog`, `da-fare`, `in-corso`, `in-revisione`, `fatto` |
| `priorita` | `alta`, `media`, `bassa` |
| `area` | facoltativa: lettere minuscole, cifre, punto, trattino; al massimo 32 caratteri |
| `posizione` | ordine nella colonna: lettere `a-z`, mai terminata da `a` |
| `creato`, `aggiornato` | data ISO in UTC (`2026-10-22T10:00:00.000Z`) |
| `legami` | facoltativo: riferimenti a voci di debito, rami, altri task; al massimo 20 |

I campi che non conosce restano dove sono: puoi aggiungerne di tuoi, una riga `nome: valore`.

## Regole

- **Un task nuovo** ha l'id successivo al più alto presente, contando anche `archivio/`, e `posizione` dopo l'ultimo della sua colonna. Chiuderlo vuol dire `stato: fatto`.
- **Toglierlo dalla board** (un doppione, un task scritto per sbaglio) vuol dire spostare il file, intero, in `archivio/`: la console lo fa con «Archivia…» nel dialog del task, con una conferma, e lo rimette a posto con «Ripristina». Non cancellare il file: il suo id non si riusa.
- **Cambiando un task** aggiorna `aggiornato` con l'ora di adesso: la console lo usa per accorgersi che qualcun altro l'ha modificato nel frattempo.
- **Spostarlo** nella colonna: cambia `posizione` di quel solo file, con una stringa che sta fra i due vicini nell'ordine alfabetico (fra `g` e `h` va bene `gn`). Lascia perdere se non serve: la console lo fa da sola.
- **Un file sbagliato** non rompe gli altri: la console lo segnala per nome e lo salta finché non è corretto.
