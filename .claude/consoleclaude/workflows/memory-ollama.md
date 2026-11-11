# Workflow: Memory Ollama — Regole

> **Revisione doc:** 2026-10

## Principio

Aggiornamento automatico e asincrono della memoria di progetto tramite LLM locale dopo un commit. A lanciarlo è la console, quando il commit è fatto dalla sua vista Git: nessun hook git nel repository. Claude Code non partecipa — legge la memoria come sempre, senza sapere chi la scrive.

> Il provider può essere Ollama (default) o LM Studio: selezione, precedenza e vincoli in `.claude/consoleclaude/workflows/llm-provider.md`. Qui sotto si assume Ollama.

## Regole

- **Spento di default**: si accende per progetto con `"enabled": true` in `.claude/memory-sync.json`. Un commit fatto da terminale o da un altro programma non lo avvia.
- **Il LLM locale deve essere in esecuzione** (`ollama serve`); se non lo è, salta in silenzio e scrive una riga di log. Il commit non è mai bloccato.
- **Modello di default**: `qwen3-coder:30b` (code-aware, ~19GB — richiede macchina capiente; alternativa low-RAM: `qwen2.5-coder:7b`)
- **Python 3.8+** richiesto nel PATH (usato per chiamate HTTP)
- **Aggiorna solo** `sprint.md` (task completati) e `tech-debt.md` (TODO/FIXME nel diff)
- **NON aggiorna** `conventions.md`, `decisions.md`, `domain.md`, `backlog.md`, `adr.md`
- **Disabilita**: `"enabled": false` in `.claude/memory-sync.json`, oppure `CONSOLECLAUDE_MEMORY_SYNC=0` nell'ambiente con cui si avvia l'app (vale per tutti i progetti; spegne anche la sintesi di `session-log.md` dell'hook `save_context`). Spento, non scrive niente, nemmeno il log
- **File corrotto**: ripristina con git (`git checkout .claude/memory/sprint.md`)

## Pattern

- **Attivazione**: l'installazione crea `.claude/memory-sync.json` con `enabled: false`; cambialo in `true`: la sincronizzazione parte dal commit successivo, fatto dalla vista Git della console.
- **Configurazione**: `.claude/memory-sync.json` — controlla modello, URL, file abilitati
- **Log**: NDJSON in `.claude/memory-sync.log` — filtra con `grep` per file aggiornati
- **Modelli per RAM**: 32GB+ → `qwen3-coder:30b` (default); 8-16GB → `qwen2.5-coder:7b`; ≤8GB → `llama3.2:3b`

## Reference → `.claude/consoleclaude/workflows/memory-ollama-reference.md`
