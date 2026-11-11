---
triggers: grafica | icona | immagine | illustrazione | screenshot | figcraft | svg | png | design
---
# Workflow: Grafica con FigCraft — Regole

> **Revisione doc:** 2026-11

## Principio

I programmi ArtCraft in generale (confinamento, senza il programma, rischi): `.claude/consoleclaude/workflows/artcraft.md`.

FigCraft è un editor 2D già installato sul PC dell'utente. La console lo offre alla sessione come server MCP (`mcp__figcraft__*`) solo se lo trova e se un Dot della sessione (o della sua squadra) ne elenca gli strumenti, e lo confina alla cartella del progetto: tutto ciò che sta fuori viene rifiutato. Si disegna, si guarda con uno screenshot, si corregge, si esporta in un file del progetto. Se gli strumenti non ci sono, non cambia nulla per il resto del lavoro: l'SVG si scrive a mano e il PNG richiede FigCraft.

## Regole

- **Prima la richiesta, poi il disegno**: misura finale, formato (PNG per un'immagine, SVG per un'icona vettoriale), colori e stile. Un'icona somiglia a quelle del progetto che ci sono già (colori, spessori, angoli): guardale con Glob e Read prima di disegnare
- **Il ciclo è sempre lo stesso**: crea con `mcp__figcraft__create_node`, guarda con `mcp__figcraft__screenshot`, correggi con `mcp__figcraft__set_properties`, esporta con `mcp__figcraft__export`. Se questi strumenti non ci sono, il ciclo non parte: si scrive un SVG a mano (vedi «Senza FigCraft»)
- **Percorsi assoluti dentro il progetto**: `path` di export, salvataggio e apertura dev'essere assoluto e sotto la cartella del progetto. Fuori dalla cartella o con `..` viene rifiutato, anche dentro `batch` e `run_command`; un percorso relativo si risolve sulla cartella di lavoro del server, quindi non lo si usa. La cartella consentita è elencata nelle istruzioni che il server manda all'avvio
- **Fuori dalla cartella non si scrive**: un rifiuto è un risultato dello strumento (`isError`), non un guasto. Non si cerca un'altra via
- **Mai sopra un file che non è grafica**: le scritture di FigCraft non passano dal perimetro dei Dot, hanno come limite la cartella del progetto, quindi un `path` sbagliato può sovrascrivere codice o `.git`. Prima di esportare si guarda con Glob cosa c'è già
- **Sorgenti e uscite in `design`**: il documento di FigCraft (`.figcraft`) e le immagini esportate stanno in `design`, a meno che il brief nomini un'altra cartella
- **Il documento vive in memoria**: ogni sessione parte da un documento vuoto. L'ultimo passo di un lavoro è salvare con `mcp__figcraft__save_file`; per riprenderlo si apre con `mcp__figcraft__open_file`. Se non ci sono, non c'è documento da salvare
- **Pochi screenshot, piccoli**: ogni immagine entra nel contesto e costa. `maxSize` basso (512 basta quasi sempre), uno dopo i primi passi e uno dopo ogni correzione importante. Per rileggere lo stato di un nodo si usano `get_node` e `inspect_document`, che non costano immagini
- **`list_commands` sempre con `filter`**: senza filtro elenca centinaia di comandi e riempie il contesto. Si cerca per parola (`export`, `align`, `boolean`) e poi si esegue con `run_command`
- **Più operazioni insieme con `batch`**: una chiamata sola per una serie di creazioni o di proprietà, invece di decine di chiamate

## Pattern

### Le coordinate e le proprietà
- Le coordinate sono relative al genitore (`parent`), con la y verso il basso. Larghezza e altezza di default: 100
- `create_node` vuole solo `type` (`frame`, `rectangle`, `ellipse`, `polygon`, `star`, `line`, `arrow`, `text`, `vector`, `section`, `component`, `slice`); il resto è facoltativo: `name`, `x`, `y`, `width`, `height`, `parent`, `text`, `path` (un tracciato SVG, per i `vector`) e `props`
- `props` e `set_properties` condividono le chiavi: per esempio `fill`, `cornerRadius`, `fontSize`, `layout` (`vertical`), `gap`, `padding`
- Il primo testo del documento è più lento (FigCraft indicizza i font di sistema, circa un secondo): è normale

### Esportare
- `mcp__figcraft__export` senza `ids` esporta la selezione corrente, e dopo una creazione la selezione è l'ultimo nodo creato: si passa sempre `ids` con l'id del frame. Se lo strumento non c'è, l'immagine non si può produrre
- Con `path` il file viene scritto e la risposta dice solo i byte; senza `path` l'immagine torna nel contesto (costosa). Per salvare si passa sempre `path`
- Formati: `png`, `jpg`, `svg`, `webp`, `pdf`. `scale` ingrandisce l'uscita (2 per uno schermo ad alta densità), `size` la fissa (`512w`)
- Dopo l'esportazione si apre il file con Read: un PNG lo si vede, e si controlla che sia quello giusto

### Ricetta: un'icona a 16, 24 o 32 px
1. Un frame quadrato della misura finale (16, 24 o 32), senza `layout`: le forme si mettono a mano
2. Coordinate, larghezze e altezze intere: così i bordi cadono sui pixel. Un tratto di 1 px si disegna come un rettangolo pieno largo 1 px; i tratti più spessi hanno spessore pari
3. Una sola forma riconoscibile, pochi elementi, margine uguale su tutti i lati; colori del progetto, contrasto sufficiente sul tema chiaro e su quello scuro
4. Screenshot del frame con `scale` alto (8 o più) per vedere i pixel; poi export a scala 1 in `design`, con la misura nel nome (`icona-32.png`)
5. Se serve anche il vettoriale, export `svg` dello stesso frame

### Ricetta: un'immagine per il README o per GitHub
1. Un frame della misura richiesta: 1280 per 640 px per l'anteprima social di GitHub, circa 1200 per 300 per un banner del README
2. Sfondo a tinta unita o a due colori, titolo con `text` e `fontSize` grande, un solo elemento grafico
3. Export PNG con `scale` 2 se l'immagine verrà vista su schermi nitidi; nome parlante (`copertina-readme.png`)

### Ricetta: l'impaginazione di una schermata
1. Un frame della misura della schermata (per esempio 390 per 844 per un telefono, 1440 per 900 per un computer) con `layout: vertical`, `gap` e `padding`
2. Le parti (intestazione, elenco, pulsante) come frame annidati, ognuno con il suo `layout`; i testi con `fontSize` e le stesse proporzioni dell'interfaccia vera
3. Una serie di creazioni in un solo `batch`; screenshot a 512 per controllare allineamenti e margini
4. Export PNG per la revisione; il collegamento al codice è dello Sviluppatore, il Designer scrive solo dove e come

### Senza FigCraft
- Se gli strumenti `mcp__figcraft__*` non ci sono (FigCraft non installato, spento con `CONSOLECLAUDE_TOOLS_OFF=figcraft`, sessione senza strumenti, o nessun Dot della sessione lo elenca), un'icona o una forma semplice si scrive come SVG con Write, con `viewBox`, misure esplicite, colori nel file e nessuno script. Si dice che il PNG richiede FigCraft
- Per un'immagine che non si può fare a mano in SVG si riporta che serve FigCraft; non si inventa un ripiego
