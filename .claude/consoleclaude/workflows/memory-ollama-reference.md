# Memory Ollama — Reference Completa
> **Revisione doc:** 2026-10

> Contiene il diagramma del flusso, i prerequisiti, la configurazione di `.claude/memory-sync.json`, cosa aggiorna il modello locale e cosa no, il formato del log e il troubleshooting.

---

## Come funziona — Diagramma completo

```
commit riuscito dalla vista Git della console
    │
    └─▶ la console lancia memory_sync.py (in background, non blocca)
            │
            ├─ non parte se .claude/memory-sync.json manca o è un JSON valido senza
            │  enabled:true, o se CONSOLECLAUDE_MEMORY_SYNC=0 (senza scrivere niente,
            │  nemmeno il log); un JSON rotto parte e lascia `config_invalid` nel log
            ├─ legge: git log -20, git diff HEAD~1
            ├─ legge: .claude/memory/sprint.md
            ├─ legge: .claude/memory/tech-debt.md
            │
            └─▶ LLM locale  (Ollama: http://localhost:11434)
                    │
                    ├─ aggiorna sprint.md  (task completati da commit)
                    ├─ aggiorna tech-debt.md  (TODO/FIXME in diff)
                    └─ scrive log: .claude/memory-sync.log
```

Claude Code non partecipa — legge la memoria come sempre, senza sapere chi la scrive. Nessun file in `.git/hooks`: se non committi dalla console, non succede nulla.

---

## Prerequisiti — Dettagli

1. [Ollama](https://ollama.com) installato e in esecuzione (oppure LM Studio, vedi `.claude/consoleclaude/workflows/llm-provider.md`):
   ```bash
   ollama serve
   ```

2. Modello scaricato (scegli uno):
   ```bash
   ollama pull qwen3-coder:30b    # default — code-aware, ~19GB
   ollama pull qwen2.5-coder:7b   # alternativa low-RAM code-aware, ~4GB
   ollama pull llama3.2:3b        # leggero per macchine con poca RAM, ~2GB
   ```

3. Python 3.8+ disponibile nel PATH (usato dallo script per le chiamate HTTP).

---

## Attivazione in un progetto

L'installazione della libreria crea `.claude/memory-sync.json` con `"enabled": false`. Per accendere la funzione cambia quel valore in `true`: dal commit successivo, fatto dalla vista Git della console, la memoria si aggiorna da sola.

---

## Configurazione — `.claude/memory-sync.json`

```json
{
  "enabled": true,
  "provider": "",
  "model": "",
  "ollamaUrl": "",
  "files": {
    "sprint": true,
    "techDebt": true
  },
  "logFile": ".claude/memory-sync.log",
  "maxLogLines": 500
}
```

| Campo | Default | Descrizione |
|-------|---------|-------------|
| `enabled` | `false` | Interruttore del progetto |
| `provider` | (da `models.json`) | `ollama` o `lmstudio` |
| `model` | (da `models.json`, poi `qwen3-coder:30b`) | Modello da usare |
| `ollamaUrl` | (da `models.json`, poi `http://localhost:11434`) | URL del server; da questo file vale solo un host locale (`localhost`, `127.0.0.1`, `::1`) |
| `files.sprint` | spento se manca (`true` nel template) | Aggiorna sprint.md; vale solo il booleano `true` |
| `files.techDebt` | spento se manca (`true` nel template) | Aggiorna tech-debt.md con TODO/FIXME; vale solo il booleano `true` |
| `logFile` | `.claude/memory-sync.log` | Percorso del log: deve stare sotto `.claude/` del progetto e finire in `.log` (non in `.claude/memory/`); altrimenti `config_invalid` |
| `maxLogLines` | `500` | Righe massime in memory-sync.log |

I campi vuoti lasciano decidere `models.json` (vedi `.claude/consoleclaude/workflows/llm-provider-reference.md`).

**Host remoto.** Un URL che viene da un file del repository (`ollamaUrl` qui, `url` in `.claude/models.json` del progetto) vale solo se l'host è locale: commit, TODO e memoria non partono verso un host scritto in un repository. Un host remoto lo scegli tu, fuori dal repository: con la variabile d'ambiente (`OLLAMA_URL`, o `LMSTUDIO_URL` con LM Studio), con `CONSOLECLAUDE_MODELS` (il percorso di un tuo `models.json`) o nel `models.json` della cartella dei dati di ConsoleClaude (vale per tutti i progetti). Lascia però vuoto `ollamaUrl`: quel campo vince sulla variabile d'ambiente e su ogni `models.json`, quindi con un host remoto lì dentro il log dice `remote_url_not_allowed` anche se la variabile è impostata. Lo stesso vale per `url` in `.claude/models.json` del progetto, che vince sul `models.json` della cartella dei dati. La regola è la stessa per il riassunto che l'hook `save_context` può chiedere al modello prima di una compattazione: con un URL remoto che viene da un file del repository non parte nessuna chiamata.

---

## Cosa aggiorna il modello locale (e cosa NO)

| File | Modello locale | Note |
|------|----------------|------|
| `sprint.md` | Sì | Segna [x] i task completati dai commit |
| `tech-debt.md` | Sì | Aggiunge TODO/FIXME trovati nel diff |
| `conventions.md` | No | Richiede giudizio — usa `/session-end` |
| `decisions.md` | No | Decisioni architetturali — usa `/remember` |
| `domain.md` | No | Definizioni stabili — usa `/remember` |
| `backlog.md` | No | Richiede prioritizzazione |
| `adr.md` | No | Record formali ad alto impatto |

Se un file ha un'intestazione che dice che lo aggiorna memory-sync, l'Archivista non lo riscrive: propone la riga da aggiungere in fondo.

---

## Modelli consigliati per caso d'uso

| Macchina | Modello | RAM |
|----------|---------|-----|
| Capiente (32GB+) | `qwen3-coder:30b` (default) | ~19GB |
| Standard (8-16GB) | `qwen2.5-coder:7b` | ~5GB |
| RAM limitata (≤8GB) | `llama3.2:3b` | ~2GB |
| Solo testo (no codice) | `mistral:7b` | ~4GB |

---

## Leggere il log — Esempi completi

Il file `.claude/memory-sync.log` contiene una riga NDJSON per ogni esecuzione:

```json
{"ts":"2026-04-27T10:30:00Z","trigger":"console-commit","commit":"abc1234","model":"qwen3-coder:30b","files_updated":["sprint.md"],"duration_ms":1240,"ok":true}
{"ts":"2026-04-27T10:31:00Z","trigger":"console-commit","commit":"def5678","model":"qwen3-coder:30b","files_updated":[],"duration_ms":320,"ok":true}
{"ts":"2026-04-27T10:32:00Z","trigger":"console-commit","commit":"ghi9012","model":"qwen3-coder:30b","files_updated":[],"duration_ms":0,"ok":false,"skip_reason":"ollama_unreachable"}
```

Vedere solo i run con file aggiornati:
```bash
grep '"files_updated":\["\|"\]' .claude/memory-sync.log | grep -v '\[\]'
```

---

## Motivi di salto — `skip_reason`

Quando la sincronizzazione non lavora, l'ultima riga del log dice perché:

| `skip_reason` | Significato |
|---|---|
| `config_invalid` | `memory-sync.json` non è JSON valido, ha campi di tipo sbagliato o un `logFile` non ammesso; nessun file viene riscritto |
| `no_files` | `files.sprint` e `files.techDebt` sono entrambi spenti (vale solo il booleano `true`): non c'è niente da aggiornare e il modello non viene chiamato |
| `remote_url_not_allowed` | l'URL del modello viene da un file del repository e l'host non è locale (vedi «Host remoto») |
| `git_hook_present` | il repository ha ancora l'hook post-commit della libreria d'origine, che nomina `memory-sync`: non si aggiorna due volte |
| `memory_dir_outside_project` | `.claude/memory` è un link o una giunzione che porta fuori dal progetto: non si legge e non si scrive |
| `memory_file_outside_memory_dir` | uno o entrambi tra `sprint.md` e `tech-debt.md` sono link verso fuori da `.claude/memory` e non resta nessun file da aggiornare |
| `nothing_to_do` | nessun task aperto in `sprint.md`, nessun TODO/FIXME nuovo nel diff, primo commit del repository o file mancante (`ok` è vero) |
| `ollama_unreachable` | il provider non risponde o non ha il modello richiesto |

Per ogni file, `results` dice l'esito: `updated`, `unchanged`, `rejected` (la risposta non ha passato i controlli), `no_answer`, `changed_meanwhile` (il file è cambiato mentre il modello lavorava, per esempio per l'Archivista: non si sovrascrive), `skipped_deadline`, `skipped_outside_memory` o `error: ...`.

Se la console non trova Python 3.8+ (`python`, `py -3` o `CONSOLECLAUDE_PYTHON`), non lancia lo script e non c'è nessuna riga di log.

---

## Disabilitare — Dettagli

### Per il progetto

Imposta `"enabled": false` in `.claude/memory-sync.json`. Non c'è nessun hook git da rimuovere. Con la funzione spenta la console non lancia nemmeno Python, e non si scrive niente, nemmeno il log.

### Per tutta la console

Avvia l'app con `CONSOLECLAUDE_MEMORY_SYNC=0` nell'ambiente: la funzione non parte per nessun progetto e non scrive niente, nemmeno il log. Spegne anche la sintesi di `session-log.md` dell'hook `save_context` (nessuna chiamata al modello locale).

---

## Troubleshooting — Dettagli

**LLM non raggiungibile, o modello non scaricato** — lo script logga `skip_reason: ollama_unreachable` e non tocca i file. Il commit non è bloccato. Se manca il modello, esegui `ollama pull <model>`.

**Aggiornamenti di scarsa qualità** — prova un modello più grande (`qwen2.5-coder:14b`) o disabilita `techDebt` se il pattern di commit non è descrittivo.

**File di memoria corrotto** — il file viene riscritto solo se la risposta ha almeno 30 caratteri, non è molto più corta dell'originale (meno del 70%), contiene tutti i suoi titoli ed è diversa dall'originale; la scrittura è atomica, con fine riga e BOM dell'originale. Non si crea nessun `.bak`: per ripristinare usa git (`git checkout .claude/memory/sprint.md`).

**Non succede nulla dopo un commit** — controlla che `enabled` sia `true`, che il commit sia stato fatto dalla vista Git della console e che la console trovi Python 3.8+ (`python`, `py -3` o `CONSOLECLAUDE_PYTHON`); il motivo del salto è nell'ultima riga di `.claude/memory-sync.log`. Se il file di log non c'è o non cresce, non è detto che sia un guasto: non si scrive nessuna riga quando la funzione è spenta (`enabled` non è `true`, o `CONSOLECLAUDE_MEMORY_SYNC=0`), quando manca Python 3.8+, quando una sincronizzazione dello stesso progetto è ancora in corso, quando `.claude/memory/` manca (anche con la configurazione rotta), quando la cartella non è un repository git, quando l'installazione dell'app è incompleta (manca `llm_client.py` accanto allo script) e quando `.claude` è un link o una giunzione (nessun log passa i controlli).
