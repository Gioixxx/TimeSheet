# RTK — Rust Token Killer
> **Revisione doc:** 2026-10

## Cos'è
Proxy CLI che comprime output comandi Bash → 60-90% riduzione token. Strumento di sessione, non di applicazione. È un programma esterno: ConsoleClaude non lo installa né lo richiede; se `rtk` non c'è, `/rtk-check` lo dice e le sessioni vanno avanti senza.

## Installa
rtk init -g    # hook Claude Code (auto-rewrite)
rtk gain       # stats risparmio

## Comandi chiave
rtk ls .       → tree compatto
rtk read file  → lettura smart (-l aggressive = solo signature)
rtk git status → compact status
rtk git diff   → diff condensato
rtk test <cmd> → solo failure (-90%)
rtk err <cmd>  → filtra solo errori

## Config
~/.config/rtk/config.toml: exclude_commands, tee mode (failures/always/never)

## Integrazione
/rtk-check → diagnostica rapida (rtk sul PATH, hook attivo, risparmio)
La riscrittura del circuit-breaker (`rtkRewrite`) è spenta di default: `rtk init -g` riscrive già i comandi, e due riscritture darebbero `rtk rtk …`.

## Reference → `.claude/consoleclaude/stacks/rtk-reference.md`
