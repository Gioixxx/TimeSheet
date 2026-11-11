---
triggers: artcraft | soundcraft | pdfcraft | wordcraft | gridcraft | filmcraft | deckcraft | vectorcraft | effectcraft | craft anything
---
# Workflow: Programmi ArtCraft — Regole

> **Revisione doc:** 2026-11

## Principio

I programmi ArtCraft sono installati dall'utente, solo Windows, e si lanciano come `*-cli.exe` (mai la GUI). Il Dot li usa in tre modi: come server MCP (solo i programmi confinati, e solo se un Dot della sessione li elenca), come azioni o come script d'uso. Il contratto sta in `.claude/consoleclaude/tools/artcraft/artcraft.js` (se presente), nell'aggiunta `artcraft` e non in `common`. Se un programma manca, il lavoro va avanti senza di lui e si dice quale passo non si è potuto fare. FigCraft ha la sua guida per il Designer, in `.claude/consoleclaude/workflows/figcraft.md`, che rimanda qui per le regole comuni.

## Contratto di `artcraft.js`

- `find(nome, opts)` → `{ path, reason }`; `available(nome, opts)` → `{ ok, reason }`.
- `run(nome, args, opts)`: senza shell, `windowsHide`, stdin chiuso, tempo massimo sempre impostato (default 120000 ms, massimo 3600000 ms).
- `mcp(nome, { roots, ... })`: client stdio JSON-RPC, protocollo `2025-06-18`. `roots` è obbligatoria, una cartella assoluta ed esistente. Gli argomenti dopo l'eseguibile sono quelli di `mcpArgs` nel registro: il chiamante non ne passa.
- Errori `ArtcraftError` con codice `NOT_WINDOWS`, `NOT_FOUND` (solo programma assente), `TIMEOUT`, `EXIT`, `PROTOCOL`, `DENIED` (verbo o flag vietato). Errori di chi chiama: `TypeError`, prima di avviare qualunque processo.
- La libreria non usa il PATH.

Dettagli nell'ADR 0014 di ConsoleClaude (`docs/adr/0014-programmi-artcraft.md`) §4 e nel codice.

## Trovare il programma

Ordine: `CONSOLECLAUDE_PROGRAMS` (la console la passa alle azioni e agli script), poi `CONSOLECLAUDE_<NOME>`, poi le cartelle di installazione di Windows (Program Files, ProgramW6432 e la cartella `Programs` del profilo utente), ciascuna con `<cartella>\<file>`. FilmCraft, DeckCraft, VectorCraft ed EffectCraft stanno in `ArtCraft\<nome>\` e si trovano senza variabile. Una variabile impostata e non valida spegne il programma, con il motivo, e non cerca altrove (ADR 0014 §2). Lo script non rifà la ricerca: se `CONSOLECLAUDE_PROGRAMS` c'è, è l'elenco autorevole.

## Programmi, server e azioni

| Programma | Cartella | Server MCP | Azioni (cartella `actions` dell'installato, se presente) | Script d'uso | Provato |
|---|---|---|---|---|---|
| FigCraft | `FigCraft\` | sì, confinato (19 sul server, 18 nel catalogo) | info, convert, export, render, run (`figcraft/`) | `figcraft-image` | sonda `--live` 2026-11-03: tool dedicati e comandi generici con percorso; `claude` vero: campagna Q |
| SoundCraft | `SoundCraft\` | sì, confinato (17) | info, convert | `soundcraft-score` | sonda: tool dedicati, `execute`, `batch`; `claude` vero: Q |
| PdfCraft | `PdfCraft\` | sì, `--compact` (17) | info, text, render, edit, combine, split | `pdfcraft-read` | sonda: tool dedicati, `command_run`, `command_batch`; `claude` vero: Q. Non elencato dai Dot della libreria: vedi sotto |
| WordCraft | `WordCraft\` | sì, confinato (17) | info, text, convert, render | `wordcraft-pdf` | sonda: tool dedicati, `execute`, `batch`; `claude` vero: Q |
| DeckCraft | `ArtCraft\DeckCraft\` | sì, confinato (25): presentazioni `.deckcraft` e `.pptx` | nessuna | nessuno | sonda `--live` 2026-11-05: tool dedicati, `run_command`, `batch`; `claude` vero: non provato |
| VectorCraft | `ArtCraft\VectorCraft\` | sì, confinato (33): illustrazione vettoriale, SVG, PDF, `.ai` | nessuna | nessuno | sonda `--live` 2026-11-05: tool dedicati, `run_command`, `command_run`, `command_batch`; `claude` vero: non provato |
| EffectCraft | `ArtCraft\EffectCraft\` | sì, confinato (27): motion graphics, progetti `.ecproj` | nessuna | nessuno | sonda `--live` 2026-11-05: tool dedicati, `execute_command`, `command_run`, `batch`, `command_batch`; `claude` vero: non provato |
| GridCraft | `GridCraft\` | no | info, cat, convert, eval (formula ristretta) | `gridcraft-csv` | `--cwd` e script a mano; `gridcraft-eval` non provato con GridCraft vero |
| Craft Anything | `Craft Anything\` | no; verbi e flag vietati (`setup`, `uninstall`, `chat`, `rebuild`, `ai`, `--allow-run`) | doctor, capabilities (solo `--format=text`) | `craft-anything-diagnosi` | `--cwd` e script a mano |
| FilmCraft | `ArtCraft\FilmCraft\` | no | probe, inspect, render, export | `filmcraft-frame` | `--cwd` e script a mano |

In tutto: 29 azioni ArtCraft (22 della fase 7 e 7 script d'uso) e le 5 azioni FigCraft in `figcraft/`. Un'azione con `richiede` non soddisfatto non compare. Le prove a mano e la sonda sono in ADR 0014.

## Server MCP: regole

- Il server parte con `mcp`, `--automation-read-root {project}` e `--automation-write-root {project}`, con la cartella del progetto (`{project}` vale solo come voce intera). PdfCraft aggiunge `--compact`. Mai `--connect`, `--attach`, `--bridge`, `--demo`, `--in`, `--sample`: si collegano all'app aperta o a un file di prova, e le radici non si applicano.
- Si accende per sessione solo se un Dot della sessione, o della sua squadra, elenca `mcp__<nome>__<tool>` per nome. Niente jolly: `TOOL_RE` rifiuta un `mcp__*` nei `tools`. Mai in user scope. `CONSOLECLAUDE_TOOLS_OFF=<nome>` spegne solo il server.
- Un programma non confinato non ha server: i suoi `mcp__<nome>__*` sono filtrati anche se un Dot li elenca (ADR 0014 §3).
- **Radice di scrittura = tutto il progetto.** I server possono scrivere anche in `.git/hooks`, `.claude/`, `.mcp.json` e nei file di lint. Azioni e script no: lì le zone protette sono rifiutate. È un rischio residuo accettato dall'utente (rischio 17 dell'ADR).
- **Comandi generici.** Permessi ai Dot per FigCraft (`run_command`, `batch`), SoundCraft (`execute`, `batch`), WordCraft (`execute`, `batch`), DeckCraft (`run_command`, `batch`), VectorCraft (`run_command`, `command_run`, `command_batch`) ed EffectCraft (`execute_command`, `command_run`, `batch`, `command_batch`). Con un parametro di percorso restano limitati alla radice: la sonda ha provato 138 forme fuori radice, tutte rifiutate.
- **EffectCraft e gli script.** `run_script` e `script_ui` sono nell'elenco e un Dot può nominarli, ma con le radici di confinamento il server rifiuta `run_script` da solo («`script.run` is not available while file access is confined»): provato dal vivo. Non serve a nulla finché il server è confinato; i comandi (`execute_command`, `batch`) e i tool dedicati (`add_effect`, `set_property`...) fanno lo stesso lavoro.
- **`call_app`, `ui_*`, `answer_dialog`, `open_panel` e simili** pilotano l'app aperta (`--connect`), che la console non usa mai: con il server confinato non hanno nessuna app da pilotare.
- **PdfCraft.** `tool_call`, `command_run` e `command_batch` non sono elencati dai Dot della libreria (test `test/test_dots_forbidden_tools.js`). Un Dot che l'utente elenca a mano non è coperto da questo divieto. Il divieto è un controllo di test, non un filtro a runtime.

## Azioni e script

- Azioni: id `<programma>-<verbo>`, `richiede: ["programma:<nome>"]`, `comando[0]` il nome del programma. Rischio `lettura` o `scrittura`; nessuna `pubblica`.
- Script: `library/tools/artcraft/<nome>-<uso>.js`, con `--help`. Esce con 0 se va, 1 per un errore, **2 se il programma manca**, con una riga. Resta nell'app e non si copia nel progetto: l'azione lo lancia con `{script:artcraft/<nome>-<uso>.js}` dalla cartella `library/tools` dell'app (ADR 0015), così si aggiorna con l'app. Nel progetto restano `artcraft.js` e `script-kit.js`, per gli script che scrivi tu.
- Percorsi: relativi al progetto; niente percorsi assoluti, unità, UNC né `..`. Un valore libero non comincia con `-` né con `@`.
- Il `:` è rifiutato nei parametri (flussi NTFS). Eccezione: i percorsi fissi di `cartella` e `uscite` non passano da questo controllo (`checkRelative` in `src/console/actions.js`, voce Bassa in `tech-debt.md`).
- Uscite (`esiste` diverso da `true`): il file non deve già esistere. Non finiscono in `.git`, `.claude`, `.cursor`, `.vscode`, `.vibekit`, `.husky`, `.mcp.json` né nei file di configurazione del lint, a qualunque profondità. Un collegamento rotto nel percorso d'uscita è rifiutato (non provato dal vivo).
- Gli ingressi (`esiste: true`) non sono confinati: un programma può leggere fuori dal progetto.
- Gli enum (`{operazione}`, `{modo}`) hanno valori fissi.

## Confinamento: provato e non provato

- **Provato sui server** (sonda `tools/probe-artcraft.js --live`, 2026-11-03): rifiuti di lettura e scrittura fuori dalle radici, con percorso assoluto, `..`, `\\?\`, barre diritte e junction, sui tool dedicati e sui comandi generici con percorso di FigCraft, SoundCraft, PdfCraft e WordCraft; il 2026-11-05 lo stesso per DeckCraft, VectorCraft ed EffectCraft (compresi `file.package`, `renderQueue.add` e `render.preRender`, e il rifiuto di `run_script`). Nessun file fuori dopo la chiusura del server.
- **Provato con cartella corrente vuota** per i 28 verbi usati da azioni e script (`--cwd`).
- **Non provato (DeckCraft, VectorCraft, EffectCraft):** sessione `claude` vera; comandi con percorso oltre apertura, salvataggio ed esportazione (`insert.audio`, `insert.video`, `links.relink`, `library.import`, `dataset.import`, importazione di modelli 3D), `roto.model.install` ed `face.model.install` di EffectCraft.
- **Non provato:** stampa, firma, JavaScript nei PDF, comandi senza `path` o che scrivono altrove (`setup.disk_allocation` e `track.save_preset` di SoundCraft), `doc_create` fuori radice (risponde riuscito con `path: null`: non scrive, ma il Dot riceve un successo), sessione `claude` vera (campagna Q), nomi 8.3, UNC, flussi NTFS, collegamenti simbolici veri.
- Le prove positive di `file.open` (FigCraft e WordCraft) sono su file già aperti: provano che non è rifiutato, non che apre da zero.
- `doc_reduce` dentro la radice risponde riuscito ma non salva se la copia non è più piccola: non è un rifiuto.

## Senza il programma

- Server assente: il motivo sta in `skipped` e nei requisiti; le azioni che lo richiedono non compaiono.
- Lo script esce con 2 e una riga. Il Dot dice che non può fare quel passo, o ripiega come in `.claude/consoleclaude/workflows/figcraft.md` («Senza FigCraft»), e lo dice. Non cerca il programma altrove.

## Rischi residui

Il dettaglio e la numerazione sono in ADR 0014, «Rischi residui».

- server MCP che scrivono in tutto il progetto (rischio 17, accettato);
- comandi generici non provati: stampa, firma, JavaScript PdfCraft, comandi senza percorso (rischio 18);
- tool con percorsi non sondati: `doc_print`, `doc_export_office`, `image_save`, `doc_watermark` (rischio 15); `wait_for_changes` di FigCraft è fuori dal catalogo (task D2);
- file d'ingresso che citano file esterni (rischio 11);
- Bash diretto, script propri e agenti di `.claude/agents` non passano dai filtri dei Dot (rischi 1-4);
- `gridcraft-eval`: il divieto per nome vale solo per il parametro `formula`, non per le formule già nel foglio; costruttori di testo non nominati (MID, SUBSTITUTE, ENCODEURL, FILTERXML) e `WEBSERVICE` non provati con GridCraft vero (rischio 20);
- PdfCraft sovrascrive dentro `pdfcraft-split` (rischio 13);
- ripiego sul PATH in `resolveProgram` di `src/console/actions.js` per le azioni di progetto senza `richiede`: da verificare, task T-0136 (aperto). Non è un fatto: la libreria `artcraft.js` non lo usa.

## Stato di prova

La prova con `claude` vero è nella sezione Q di `docs/campagna-test.md`. Lo stato per programma è nella colonna «Provato».
