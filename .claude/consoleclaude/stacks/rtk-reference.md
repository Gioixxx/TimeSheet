# RTK — Rust Token Killer (Reference Dettagliata)
> Revisione doc: 2026-10

> Contiene l'installazione, i comandi completi per categoria, l'analisi del risparmio, la configurazione e come funziona su Windows. Per l'essenziale: `.claude/consoleclaude/stacks/rtk.md`.

## Installazione completa
### macOS
```bash
brew install rtk
```
### Linux/macOS alternativo
```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
# poi aggiungi ~/.local/bin al PATH in ~/.bashrc o ~/.zshrc
```
### Cargo (tutte le piattaforme)
```bash
cargo install --git https://github.com/rtk-ai/rtk
```
### Verifica
```bash
rtk --version
rtk gain
```
> **Name collision:** su crates.io esiste "rtk" (Rust Type Kit). Se `rtk gain` fallisce, usa `cargo install --git`.

## Integrazione Claude Code
```bash
rtk init -g               # hook PreToolUse + RTK.md (consigliato)
rtk init -g --hook-only   # solo hook
rtk init --show           # verifica installazione
```
Riavvia Claude Code dopo l'installazione. L'hook riscrive i comandi Bash automaticamente.

### Funzionamento hook
```
Claude: "git status" → rtk rewrite → "rtk git status" → output compresso a Claude
```
> I tool nativi (Read, Grep, Glob) bypassano l'hook. Usa `rtk read`, `rtk grep`, `rtk find` per filtrarli.

## Risparmio token stimato
| Comando | Frequenza | Standard | Con RTK | Risparmio |
|---------|-----------|----------|---------|-----------|
| `ls` / `tree` | 10x | 2.000 | 400 | -80% |
| `cat` / `read` | 20x | 40.000 | 12.000 | -70% |
| `grep` / `rg` | 8x | 16.000 | 3.200 | -80% |
| `git status` | 10x | 3.000 | 600 | -80% |
| `git diff` | 5x | 10.000 | 2.500 | -75% |
| `cargo test` / `npm test` | 5x | 25.000 | 2.500 | -90% |
| `pytest` | 4x | 8.000 | 800 | -90% |
| **Totale** | | **~118.000** | **~23.900** | **-80%** |

## Comandi completi
### File e navigazione
```bash
rtk ls .                         # tree compatto
rtk read file.rs                 # lettura smart
rtk read file.rs -l aggressive   # solo signature
rtk grep "pattern" .             # risultati raggruppati
rtk find "*.rs" .                # compact find
rtk diff file1 file2             # diff condensato
```

### Git
```bash
rtk git status                   # compact status
rtk git log -n 10                # one-line commits
rtk git diff                     # diff condensato
rtk git add .                    # → "ok"
rtk git commit -m "msg"          # → "ok abc1234"
rtk git push                     # → "ok main"
rtk git pull                     # → "ok 3 files +10 -2"
rtk gh pr list                   # PR compatte
rtk gh pr view 42                # PR details + checks
```

### Test runner
```bash
rtk cargo test                   # solo failure (-90%)
rtk pytest                       # solo failure (-90%)
rtk go test ./...                # NDJSON compact (-90%)
rtk jest                         # solo failure (-90%)
rtk vitest                       # solo failure (-90%)
rtk playwright test              # solo failure (-90%)
rtk test <cmd>                   # wrapper generico — solo failure
rtk err <cmd>                    # filtra solo errori
```

### Build e lint
```bash
rtk tsc                          # errori TypeScript raggruppati
rtk lint                         # ESLint raggruppato
rtk cargo build                  # compact (-80%)
rtk cargo clippy                 # compact (-80%)
rtk next build                   # compact Next.js build
rtk ruff check                   # JSON, -80%
rtk golangci-lint run            # JSON, -85%
rtk rubocop                      # JSON, -60%+
```

### Package manager
```bash
rtk pnpm list                    # dependency tree compatto
rtk pip list                     # pacchetti Python (auto-detect uv)
rtk pip outdated                 # pacchetti outdated
rtk prisma generate              # senza ASCII art
```

### Container e cloud
```bash
rtk docker ps                    # lista container compatta
rtk docker logs <name>           # log deduplicati
rtk docker compose ps            # servizi compose
rtk kubectl pods                 # lista pod compatta
rtk kubectl logs <pod>           # log deduplicati
rtk aws ec2 describe-instances   # compact
rtk aws logs get-log-events      # solo messaggi con timestamp
rtk aws cloudformation describe-stack-events  # failure first
```

## Analisi risparmio
```bash
rtk gain                         # sommario complessivo
rtk gain --graph                 # grafico ASCII 30 giorni
rtk gain --history               # storia comandi con % risparmio
rtk gain --daily                 # breakdown giornaliero
rtk gain --all --format json     # export JSON
rtk discover                     # opportunità perse sessione corrente
rtk discover --all --since 7     # tutti i progetti, 7 giorni
rtk session                      # adozione RTK sessioni recenti
```

## Configurazione
File: `~/.config/rtk/config.toml` (macOS: `~/Library/Application Support/rtk/config.toml`)
```toml
[hooks]
exclude_commands = ["curl", "playwright"]  # comandi da NON riscrivere

[tee]
enabled = true
mode = "failures"   # "failures" | "always" | "never"
```
> In caso di failure, output grezzo salvato in `~/.local/share/rtk/tee/`.

## Flag globali
```bash
rtk <cmd> -u    # ultra-compact: icone ASCII, inline
rtk <cmd> -v    # verbose: debug output
rtk proxy <cmd> # passthrough raw senza filtraggio
```

## Supporto altri AI tool
```bash
rtk init -g --gemini       # Gemini CLI
rtk init -g --codex        # Codex (OpenAI)
rtk init -g --agent cursor # Cursor
rtk init --agent windsurf  # Windsurf
rtk init --agent cline     # Cline / Roo Code
```

## Disinstallazione
```bash
rtk init -g --uninstall    # rimuove hook, RTK.md, settings.json
brew uninstall rtk         # se installato via brew
cargo uninstall rtk        # se installato via cargo
```

## Windows
- WSL: funziona nativo
- Windows nativo: modalità CLAUDE.md injection (no auto-rewrite, filtri manuali)

## Integrazione
- `/rtk-check`: diagnostica rapida (`rtk` sul PATH, hook attivo, risparmio). Se `rtk` non c'è, dice come installarlo e che il risparmio non c'è.
- Circuit-breaker: la riscrittura `rtkRewrite` in `.claude/consoleclaude/circuit-breaker.json` è spenta di default (`[]`). `rtk init -g` riscrive già i comandi Bash: tenerle accese entrambe darebbe `rtk rtk …`. Vedi `.claude/consoleclaude/workflows/enforcement-hooks-reference.md`.
- ConsoleClaude non installa `rtk` e non scrive il suo hook globale.
