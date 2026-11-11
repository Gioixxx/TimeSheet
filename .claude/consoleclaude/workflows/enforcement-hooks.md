# Workflow: Enforcement Hooks — Regole

> **Revisione doc:** 2026-10

## Principio

Sposta regole *aspirazionali* (non ingerire dump/lockfile/file enormi, non cancellare fuori dal progetto, caricare e salvare la memoria al momento giusto) in **enforcement deterministico a 0 token**: le esegue l'harness di Claude Code via hook, non il modello. Claude non deve ricordarsele.

Loop di memoria **load↔save**: `SessionStart` auto-carica mode attivo e ultima sessione (`MEMORY.md` entra già dalla regione gestita di `CLAUDE.md`, non si inietta due volte); `PreCompact` e `SessionEnd` auto-salvano uno snapshot del lavoro in `session-log.md` prima che il contesto venga compattato o la sessione chiusa — niente ri-derivazione dopo compact/`/clear`.

## Regole

- **Dove vivono e come si attivano.** Gli hook sono codice dell'app, non del repository: la console li carica **per sessione** come plugin (`--plugin-dir`), generato nella cartella temporanea della sessione con il Python rilevato e gli script dell'app. Non scrivono nulla in `.claude/settings.json`. Da terminale, con `claude` da solo, non sono attivi.
- **Condizioni.** Python 3.8+ (gli hook sono script Python, solo stdlib) e nessun hook equivalente già registrato in `.claude/settings.json` o `.claude/settings.local.json` del progetto, né nel `settings.json` globale dell'utente (nella cartella `.claude` della home): altrimenti scatterebbero due volte, e basta uno per non caricarli tutti. Se mancano, la sessione parte uguale, senza circuit-breaker, blocco di routing e `session-log`. `CONSOLECLAUDE_HOOKS=0` li spegne.
- **Fail-open**: ogni imprevisto in un hook → `permissionDecision: "defer"` (flusso nativo). Mai rompere i tool.
- **RTK rewrite spenta di default** (`rtkRewrite: []`): `rtk init -g` riscrive già i comandi, e due riscritture darebbero `rtk rtk …`. Se la accendi nel circuit-breaker, vale solo se `rtk` è sul PATH e solo per comandi **semplici** (no pipe/`&&`/`;`/redirezioni) con verbo in `rtkRewrite`. Comandi composti passano intatti.
- **Circuit breaker (Read)**: blocca file in `denyGlobs` (sempre, anche con `limit`) o oltre `maxBytes`/`maxLines`. Un `Read` con `limit` fino a `maxLines` righe passa, perché è già a pezzi; immagini e PDF non hanno la soglia in byte. Il messaggio di diniego invita a `Grep` o a `Read` con offset e limit (per i file in `denyGlobs` solo a `Grep`).
- **Gate dei comandi distruttivi (Bash e PowerShell)**: `command_risk.py` classifica per raggio del danno, non per nome. Home, radice, credenziali, cartelle di sistema e dischi → `deny` sempre (l'utente lo lancia con `! <comando>`). Fuori dal progetto, bersaglio non determinabile (`$VAR`, pipeline, `xargs`), la cartella del progetto o la sua `.git`, git che butta lavoro non committato (`reset --hard`, `clean -f`, `push --force`…) → `deny` con richiesta di riflessione: passa solo il tentativo con una `description` che inizia con `Serve a:` e cita la richiesta dell'utente. Dentro il progetto o nelle temporanee → nessun intervento. `riskGate: false` lo spegne, `protectedPaths` aggiunge percorsi intoccabili.
- **Soglie per progetto**: `.claude/consoleclaude/circuit-breaker.json` (JSON), creato dall'installazione dal modello e poi non più aggiornato; ripiego su `.vibekit/circuit-breaker.conf`. Modificabile; se illeggibile o assente valgono i default (1500 righe, 100 KB).
- **Config di lint e cartella delle regole protette.** Un Dot non indebolisce né duplica una config di linter o formatter già esistente (con Edit, Write o MultiEdit), e non tocca `circuit-breaker.json` né `.claude/rules-guard/`. Nelle modalità `default`, `acceptEdits` e `plan` la console chiede il permesso; in `auto`, `dontAsk` e `bypassPermissions` nega. Chiavi e limiti: reference, sezione «Regole di progetto».
- **Auto-save memoria**: `save_context.py` (PreCompact + SessionEnd) estrae dal transcript uno snapshot (titolo, branch, ultima richiesta, file toccati, comandi) e fa upsert per `sessionId` in `.claude/memory/session-log.md` (rolling, ultime ~10). Sintesi via modello locale se `.claude/memory-sync.json` ha `enabled:true`, altrimenti meccanica. Non tocca `sprint.md`/`tech-debt.md`.
- **Misura del preambolo**: l'evento `InstructionsLoaded` (osservativo, non blocca) scatta per ogni `CLAUDE.md`, regola o file importato; `context_audit.py` ne registra percorso, tipo, motivo e dimensione in `.claude/context-audit.jsonl` (niente contenuto). Lo scrive solo nei repository preparati dall'app, cioè con la cartella `.claude/consoleclaude/`; negli altri non crea nulla. Il file non è nel `.gitignore` del repository: se non vuoi che finisca in un commit, aggiungilo tu. Dice cosa è stato caricato davvero, non cosa si stima.
- **Disabilita**: `CONSOLECLAUDE_HOOKS=0` per tutta l'app, oppure registra tu hook equivalenti in `.claude/settings.json` o `.claude/settings.local.json` del progetto, o nel `settings.json` globale dell'utente (la cartella `.claude` nella home): la console lo rileva e non carica i suoi.

## Pattern

- **Diagnosi**: `/lib-doctor` riporta Python, `rtk` sul PATH e gli strumenti della sessione; `.claude/consoleclaude/circuit-breaker.json` presente o no.
- **Rapporto sul preambolo**: `python .claude/consoleclaude/tools/context_report.py --report [--check]` — ultima sessione, file per peso e duplicati segnalati (exit 1 con `--check`). Legge `.claude/context-audit.jsonl`.
- **Cosa fare se un Read è bloccato**: usa `Grep` o `Read` con offset e limit (limit entro `maxLines`); un file in `denyGlobs` si cerca solo con `Grep`. Alza la soglia in `circuit-breaker.json` solo se il file va davvero letto per intero.
- **Se una scrittura è negata.** Il messaggio dice di correggere il codice. Se la regola sembra sbagliata, il Dot lo dice all'utente: la config o la regola la cambia l'utente, non il Dot, e non prova a riscriverla con un altro strumento.

## Reference → `.claude/consoleclaude/workflows/enforcement-hooks-reference.md`
