# Enforcement Hooks — Reference
> **Revisione doc:** 2026-10

> Contiene l'architettura del layer di hook, il formato dell'output, `circuit-breaker.json`, il gate dei comandi distruttivi, una tabella di esempi e il troubleshooting. Per le regole essenziali: `.claude/consoleclaude/workflows/enforcement-hooks.md`.

## Architettura

```
App (codice, caricato dalla console per sessione come plugin)
  hooks.PreToolUse   → guard.py         (Read|Bash|PowerShell|Edit|Write|MultiEdit)
  hooks.SessionStart → session_start.py
  hooks.PreCompact   → save_context.py
  hooks.SessionEnd   → save_context.py
  hooks.InstructionsLoaded → context_audit.py
  guard.py           PreToolUse: circuit-breaker + gate dei comandi distruttivi + config di lint e file del guard protetti
                     + regole di progetto (+ riscrittura RTK, spenta)
  guard_rules.py     regole di progetto (`.claude/rules-guard/`): parser e valutazione, importato da guard.py
  command_risk.py    classificazione per raggio del danno (logica pura, usata da guard.py)
  session_start.py   SessionStart: mode attivo + ultima sessione + blocco di routing (solo con il sidecar)
  save_context.py    PreCompact/SessionEnd: snapshot del transcript -> session-log.md
  context_audit.py   InstructionsLoaded: registra cosa entra nel preambolo

Repository del progetto (solo dati)
  .claude/consoleclaude/circuit-breaker.json  ← soglie/glob (per progetto)
  .claude/memory/session-log.md               ← snapshot di sessione (rolling, upsert per sessionId)
  .claude/context-audit.jsonl                 ← misura del preambolo (solo se esiste .claude/consoleclaude/; non gitignorato)
```

Loop **load↔save**: `save_context.py` salva prima di compaction/clear, `session_start.py` ricarica l'ultima entry all'avvio.

Gli hook stanno nell'app: aggiornare l'app aggiorna anche gli hook, senza toccare il repository. Il repository non contiene percorsi del programma né `.claude/settings.json` scritti per loro.

## Output degli hook (contratto Claude Code)

PreToolUse — `guard.py` stampa su stdout:

```json
{ "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|defer",
    "permissionDecisionReason": "…",
    "updatedInput": { "command": "rtk git status" }
} }
```

- `allow` + `updatedInput`: comando riscritto a RTK (trasparente; solo se `rtkRewrite` non è vuoto).
- `deny` + reason: file bloccato dal circuit-breaker (il motivo guida Claude verso Grep, o verso Read con offset e limit entro `maxLines`; un `Read` con `limit` entro `maxLines` passa, e immagini e PDF non hanno la soglia in byte), oppure comando
  distruttivo fermato dal gate (il motivo dice cosa colpirebbe e, se è da confermare, come giustificarlo).
- `ask` + reason: solo per le config di lint, la cartella delle regole e i file del guard, nelle modalità che chiedono
  (`default`, `acceptEdits`, `plan`). La scheda di permesso mostra il motivo (`decision_reason`, quando è di tipo `hook`). Nelle
  modalità `auto`, `dontAsk`, `bypassPermissions` lo stesso caso è `deny`. Provato dal vivo con claude 2.1.311.
- Solo `additionalContext` (senza `permissionDecision`): una regola di progetto `warn`. Il testo va al contesto del modello e il
  permesso resta quello del flusso normale. Provato dal vivo con claude 2.1.312.
- Il guard ha un `timeout` di 10 secondi nella configurazione dell'hook (`GUARD_TIMEOUT_S` in `src/console/tools.js`). Che cosa fa
  Claude Code allo scadere: da verificare.
- `defer`: flusso nativo (nessun intervento) — è anche il fallback di ogni errore.

SessionStart — `session_start.py` stampa testo grezzo (additionalContext): blocco `## Contesto di sessione (auto-caricato)` con mode attivo + ultima entry di `session-log.md`, più il blocco di routing «chiama prima il sidecar» se la console ha acceso il sidecar. Non ripete `MEMORY.md`: la regione di `CLAUDE.md` lo importa già. Nel contesto del modello l'output è preceduto da `SessionStart:startup hook success: `.

PreCompact / SessionEnd — `save_context.py` è **side-effect only** (non emette `decision`): legge `transcript_path`, estrae snapshot e fa upsert in `session-log.md`. Su qualsiasi errore esce 0 senza scrivere.

### session-log.md

Entry delimitate da `<!-- session:<id> -->`, upsert per `sessionId` (PreCompact + SessionEnd dello stesso giro convergono a una entry), rolling alle ultime ~10, scritte UTF-8 senza BOM. Campi: titolo (da `ai-title`), branch, range date, ultima richiesta (`last-prompt`), file toccati (`tool_use` Edit/Write), verbi comando (Bash), e `Sintesi` del modello locale se `.claude/memory-sync.json` ha `enabled:true`. Il file è locale, non va committato.

## circuit-breaker.json

```json
{
  "maxBytes": 102400,
  "maxLines": 1500,
  "denyGlobs": ["**/*.lock", "**/package-lock.json", "**/pnpm-lock.yaml", "**/yarn.lock", "**/dist/**", "**/build/**", "**/*.min.js", "**/*.map"],
  "rtkRewrite": [],
  "riskGate": true,
  "protectedPaths": []
}
```

- `maxBytes`: gate primario (lo `stat` non costa token). `maxLines`: gate secondario, valutato solo su file di testo entro `maxBytes` (una riga è un a-capo, o l'ultimo pezzo senza a-capo finale). Non si applicano a un `Read` con `limit` entro `maxLines` (già a pezzi); `maxBytes` non si applica a immagini e PDF (`.png .jpg .jpeg .gif .webp .bmp .tif .tiff .pdf`). `denyGlobs` vale sempre.
- `denyGlobs`: match euristico stile `**/…` (basename, path completo, segmenti `**/dir/**`).
- `rtkRewrite`: verbi proxati (per esempio `"git"`, `"npm"`, `"cargo"`); vuoto = nessuna riscrittura (default, perché `rtk init -g` riscrive già). La riscrittura salta i meta `rtk gain|proxy|discover` e i comandi già `rtk …`.
- `riskGate`: `false` spegne il gate dei comandi distruttivi. `protectedPaths`: percorsi in più (assoluti o con `~`) da
  trattare come le credenziali: cancellarli, o cancellare una cartella che li contiene, è sempre negato.
- Il file lo crea l'installazione dal modello e poi non lo aggiorna più. Se manca vale `.vibekit/circuit-breaker.conf` (stesso formato), e senza nessuno dei due i default del codice.

### Chiavi di protezione, regole e watchdog

| Chiave | Default | Note |
|---|---|---|
| `lintConfigGate` | `true` | protezione delle config di lint; `false` spegne anche quella dei file del guard e della cartella delle regole |
| `lintConfigFiles` | elenco in `guard.py` (`DEFAULT_CONFIG`) | nomi (glob) delle config da proteggere; `[]` non protegge nulla |
| `lintConfigAllow` | `[]` | nomi (glob) lasciati liberi |
| `projectRules` | `true` | `false` spegne le regole di `.claude/rules-guard/` |
| `loopRepeat` | `5` | chiamate identiche di fila che segnalano un loop (2-50) |
| `loopFiles` | `20` | file diversi scritti in una delega che segnalano troppi file (1-1000) |
| `loopStop` | `"auto"` | `auto`: un loop ferma il turno solo in `auto`, `dontAsk`, `bypassPermissions`; `never`: solo avviso |
| `endTurnLint` | `true` | lint a fine turno; `false` lo spegne |
| `endTurnLintTimeoutS` | `120` | tetto del lint a fine turno, in secondi (5-1800), mai più dell'azione |

Una chiave che manca vale il default del codice: l'installazione non riscrive il file. Il modello dell'installazione contiene
oggi solo `lintConfigGate`, `lintConfigFiles` e `lintConfigAllow`; le altre valgono dal codice. Per i numeri (soglie del
watchdog, tetto del lint) un valore fuori intervallo o di tipo sbagliato vale il default. Le chiavi booleane (`lintConfigGate`,
`projectRules`, `endTurnLint`) si scrivono `true` o `false`: un valore falso non booleano (`0`, `null`) le spegne.
Variabili d'ambiente: `CONSOLECLAUDE_WATCHDOG=0` spegne il rilevamento dei loop, `CONSOLECLAUDE_ENDLINT=0` il lint a fine turno
(solo il valore esatto `0`).

## Gate dei comandi distruttivi

`command_risk.py` guarda **cosa** verrebbe distrutto, non il nome del comando:
`rm`, `rmdir`, `shred`, `truncate`, `dd of=`, `find -delete|-exec rm`, `chmod|chown -R`, `rsync --delete`, `Remove-Item` e alias,
`Clear-Content`, `cmd /c rd|del`, formattazioni, più i comandi git che buttano lavoro. Segue `;`, `&&`, `||`, `|`, `$(…)`,
`bash -c`, `powershell -Command`, `cmd /c`, i `cd` del comando e i prefissi (`sudo`, `env`, `rtk`). Il corpo di heredoc e
here-string è testo, non comandi.

| Livello | Quando | Esito |
|---|---|---|
| catastrofico | radice di un disco, home o una cartella che la contiene, `~/.ssh`, `~/.aws`, le credenziali di Claude Code, cartelle di sistema, `mkfs`, `Format-Volume`, `dd` su un dispositivo | `deny` sempre |
| da confermare | fuori dal progetto, bersaglio non determinabile (`$VAR`, pipeline, `xargs`), la cartella del progetto o `.git`, `git reset --hard`, `clean -f`, `checkout -- .`, `branch -D`, `stash drop`, `push --force` senza lease | `deny` finché la `description` non inizia con `Serve a:` + la richiesta dell'utente |
| basso | dentro il progetto o in una cartella temporanea | nessun intervento |

Nessun secondo modello: il rifiuto costringe il modello che ha generato il comando a rileggere la richiesta, e ripetere
il comando alla cieca non basta. Non è una sandbox: `python -c "shutil.rmtree(…)"` o le redirezioni (`> file`) non sono
valutate.

## Config di lint e file del guard

Il controllo sulle config di lint (Edit, Write, MultiEdit) nega o chiede la modifica di una config di linter o formatter già
esistente (ESLint, Prettier, Stylelint, markdownlint, commitlint, oxlint e i file ignore). La prima creazione passa solo se nella
cartella e in quelle sopra, fino alla radice del progetto, non c'è già una config dello stesso strumento (stesse lettere iniziali
del nome). I file del guard (`.claude/consoleclaude/circuit-breaker.json`, `.vibekit/circuit-breaker.conf`) e tutta
`.claude/rules-guard/` sono protetti per percorso, anche da shell. Nelle modalità che chiedono (`default`, `acceptEdits`, `plan`)
la decisione è `ask`; altrove è `deny`. Il messaggio dice di correggere il codice.

Il controllo sui comandi di shell legge il testo del comando: copre le forme comuni di scrittura e cancellazione (redirect,
`Set-Content`, `sed -i`, `cp` o `mv` sopra, `rm`), non le indirette (variabili, script che scrivono il file, `bash -c` annidato).
Le config di lint non sono coperte da shell. `package.json` non è una config protetta.

## Regole di progetto

Un file `<progetto>/.claude/rules-guard/<nome>.md` è una regola: frontmatter e, dopo, il messaggio per il Dot. Non va in
`.claude/rules/`, che Claude Code carica come memoria.

    ---
    name: niente-rm-node-modules
    enabled: true
    event: bash
    action: block
    pattern: rm\s+-rf\s+node_modules
    ---
    Non cancellare node_modules: rilancia l'installazione se serve.

- **Chiavi:** `name`, `description`, `enabled`, `event` (`bash` o `file`), `action` (`warn`, default, o `block`), `pattern`,
  `conditions`. Una chiave sconosciuta fa saltare la regola con la diagnosi.
- **Frontmatter ridotto:** valori semplici o tra virgolette, e la lista `conditions:`. Una riga che inizia con `#` è un commento;
  un `#` dopo un valore fa parte del valore.
- **`conditions:`:** voci con `field`, `operator` (default `regex_match`: anche `contains`, `equals`, `not_contains`,
  `starts_with`, `ends_with`) e `pattern`. Devono valere tutte; al massimo 10.
- **Campi:** `bash` ha `command`; `file` ha `file_path`, `new_text` (il `content` di Write, il `new_string` di Edit e MultiEdit) e
  `old_text`. Da solo, `pattern` è una `regex_match` sul campo principale.
- **`block`** nega con il corpo come motivo. **`warn`** aggiunge il corpo come contesto (una riga per regola, al massimo 2048
  caratteri); il permesso non cambia. Il corpo arriva al massimo a 1000 caratteri.
- **Tetti:** 50 file, 16 KB per file, 500 caratteri di pattern, 64 KB di testo per campo, 2 secondi per evento. Una regola che
  non si carica si salta e non ferma le altre.
- **Regex:** niente gruppi ripetuti che contengono una ripetizione, anche con `{n}`. Un tetto di tempo per match c'è solo dove c'è
  SIGALRM (non su Windows). Su Windows le regole non si valutano quando la decisione è già `ask`.
- **Diagnosi:** `python guard.py --check-rules [progetto]` elenca le regole caricate e quelle saltate; esce con 1 se ne salta una.
  In sessione le diagnosi vanno solo su stderr.
- **Spegnere:** `"projectRules": false`.

Un progetto con regole ma senza hook attivi non le applica: la console lo scrive nella sessione.

## Lint a fine turno e loop (watchdog)

- **Lint a fine turno** (`src/console/endlint.js`): a fine turno con file scritti con successo lancia una volta per progetto
  l'azione `lint` dello stack (tetto `endTurnLintTimeoutS`), con `actions.createRunner`. Al più tre progetti per turno. Parte
  solo se chi ha scritto poteva già lanciarla: il mod `dots` acceso, `mcp__actions__run` fra gli strumenti del Dot e un
  `actions:` che la consente, rischio `lettura`, azione approvata. Un progetto con una scrittura senza diritto salta il lint;
  una scrittura senza un Dot a cui attribuirla lo salta allo stesso modo. Un turno fermato o finito in errore non lancia nulla.
  I file passano al turno dopo se il turno si è fermato o è finito in errore, o se il progetto era occupato; con diritto
  mancante, esito fallito o timeout no. Senza il mod `dots` non parte. Se `mcp__actions__run` non c'è, il lint a fine turno non parte: si lancia a mano il comando di lint del `CLAUDE.md`.
- **Watchdog** (`src/console/watchdog.js`): loop per Dot (delega o Dot principale) e troppi file per delega. Il segnale è un evento
  `console_watch` nella storia della sessione. Su Cursor il loop si controlla solo per `Bash` e non ferma mai il turno.

Entrambi lavorano sugli eventi della sessione: nessun token, nessun processo in più.

## Esempi di comportamento

| Tool input | Esito |
|---|---|
| Bash `git status` (rtk presente, `rtkRewrite` con `git`) | `allow` → `rtk git status` |
| Bash `git status` (default, `rtkRewrite` vuoto) | `defer` |
| Bash `git log \| head` | `defer` (composto) |
| Bash `rtk gain` | `defer` (meta) |
| Bash `rm -rf build` | `defer` (dentro il progetto) |
| Bash `rm -rf ~` · PowerShell `Remove-Item -Recurse` sulla cartella home | `deny` (catastrofico) |
| Bash `rm -rf ../altro` | `deny` con richiesta di riflessione |
| lo stesso con `description: "Serve a: l'utente ha chiesto di …"` | `defer` |
| Read `package-lock.json` | `deny` (denyGlobs) |
| Read `dump.sql` da 5 MB | `deny` (maxBytes) |
| Read `src/app.ts` 80 righe | `defer` |

## Troubleshooting

- **Comandi non riscritti**: atteso, `rtkRewrite` è vuoto di default. Per accenderla elenca i verbi in `circuit-breaker.json` e verifica che `rtk` sia sul PATH (`rtk --version`); controlla anche di non avere già l'hook globale di `rtk init -g`.
- **Read sempre bloccato**: soglia troppo bassa in `circuit-breaker.json`, o glob troppo ampio.
- **Comando legittimo negato dal gate**: se è catastrofico lancialo tu con `! <comando>`; se è da confermare basta il
  secondo tentativo con `Serve a:`. Per spegnerlo in un progetto: `"riskGate": false` in `circuit-breaker.json`.
- **Hook non attivi**: servono Python 3.8+, la console (non `claude` da solo) e nessun hook equivalente già in `.claude/settings.json` o `.claude/settings.local.json` del progetto né nel `settings.json` globale dell'utente; `CONSOLECLAUDE_HOOKS` non deve valere `0`. `/lib-doctor` mostra cosa manca.
- **session-log.md non si aggiorna**: serve `.claude/memory/` esistente e un transcript con contenuto saliente.
- **Sintesi assente nelle entry**: normale se il modello locale non gira o `.claude/memory-sync.json` ha `enabled:false` → fallback meccanico.
- **Disattivare temporaneamente**: `CONSOLECLAUDE_HOOKS=0` prima di aprire la console.
- **Un Dot non può modificare una config di lint**: è la protezione. La scheda di permesso mostra il motivo. Se la regola è sbagliata, la cambi tu a mano, oppure aggiungi il file a `lintConfigAllow`, o metti `lintConfigGate: false` (che spegne anche la protezione dei file del guard e delle regole).
- **Una scrittura è negata in `auto` e non si capisce perché**: il motivo è nel messaggio di errore del Dot; `guard.py --check-rules` mostra le regole di progetto.
- **Il lint a fine turno non parte**: controlla che il Dot che ha scritto abbia `mcp__actions__run` fra i suoi strumenti e un `actions:` che consente `lint` (per dominio `test`); che l'azione sia approvata (una da approvare non parte); che il mod `dots` sia acceso; che `CONSOLECLAUDE_ENDLINT` non sia `0`. Se `mcp__actions__run` non c'è, il lint a fine turno non parte: si lancia a mano il comando di lint del `CLAUDE.md`.
- **Un turno si ferma da solo in `auto` con un avviso di loop**: `loopStop: "never"` nel progetto, o un `loopRepeat` più alto.
