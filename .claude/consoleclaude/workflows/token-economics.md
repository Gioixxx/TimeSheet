---
triggers: token economics | prompt caching | dieta preambolo | costo sessione
---
# Workflow: Token Economics — Regole

> **Revisione doc:** 2026-10

Il costo si abbatte in ordine di leva: **prompt caching** (la lettura dalla cache costa ≈0,1× l'input; 0,05× su Opus 5.5) → **prefisso piccolo** → **modello locale** per i task meccanici → le leve già attive (RTK, circuit-breaker, moduli a due livelli). In Claude Code il caching è automatico e per prefisso: conta tenerlo **stabile** (identico byte per byte tra i turni) e **piccolo**. Valgono per le sessioni Claude Code; gli strumenti che chiamano il modello locale (Ollama o LM Studio) sono gratis.

## Regole

- **Prefisso stabile.** Niente contenuto volatile in `CLAUDE.md`, nel system prompt o negli hook (date, UUID, git status, timestamp, ID di sessione): un byte che cambia fa ripagare tutto il preambolo a ogni turno.
- **Prefisso piccolo, e misurato.** Ogni token del livello 1 si paga a ogni turno di ogni Dot. Nel livello 1 solo ciò che serve sempre: un modulo grande si divide in regole (livello 1) e `-reference` (livello 2, letto con Read quando serve). Le aggiunte `ai`, `style` e `blender` stanno nel livello 2 (`extra`); Next.js e React Native tengono `style-system` nel livello 1 dello stack. Misura: `node tools/measure-region.js` (Haiku, due giri, soglia 12 000 token sulla sola regione, il totale con la base di `claude` è solo informativo; stesso metodo: `claude -p "rispondi ok" --output-format json`, somma di `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`); la regione cresce solo con una ragione.
- **Un `@` è un import eager**, anche annidato (fino a 5 livelli) e relativo al file che lo contiene. Per «su richiesta» il percorso in backtick (`` `.claude/memory/decisions.md` ``), mai `@`. La memoria entra una volta sola, dalla regione di `CLAUDE.md`.
- **Ciò che varia va in coda**: una volta a inizio sessione (`SessionStart` → `additionalContext`) o in fondo ai messaggi, mai in un punto riletto a ogni turno.
- **Sidecar obbligatorio se c'è.** Con gli strumenti `mcp__ollama-sidecar__*` in sessione, i task meccanici (bozza del commit, voce di changelog, sintesi di sessione, sintesi del diff, debito tecnico, classificazione) passano **prima** dal sidecar: è un passo del flusso, non un'opzione. Se lo strumento non c'è, o risponde `ollama_unavailable: true` (o `items: []` con `hint`, o `error: "parse_error"`), fai tu e scrivi «Sidecar: non disponibile». Senza sidecar, un task meccanico delegato va a un subagent **Haiku**, non Opus.
- **Lavoro meccanico non urgente**: la coda locale della console (**Elabora in locale**, solo quando la premi), non la Batch API. La Batch API (−50%) resta per i job asincroni che devono girare su Claude.
- **Cambiare modello a metà sessione invalida la cache**: per un altro modello usa un subagent (contesto separato).
- **Misura, non indovinare**: `cache_read_input_tokens` > 0 e crescente su turni consecutivi; se è 0 c'è un invalidatore silenzioso. Diagnosi con `/token-cost`.

Pattern (audit della cache, dieta del preambolo, routing, coda locale, diagnosi), cifre e prezzi nel reference.

## Reference → `.claude/consoleclaude/workflows/token-economics-reference.md`
