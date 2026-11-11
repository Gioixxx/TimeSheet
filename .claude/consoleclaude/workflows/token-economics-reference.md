# Workflow: Token Economics — Reference

> **Revisione doc:** 2026-10

> Contiene i numeri del prompt caching, la checklist dei silent-invalidator, i prezzi dei modelli, il routing e i punti dove agisce l'economia dei token in un progetto. Non contiene esempi di codice.

Dettagli, numeri ufficiali ed esempi per `.claude/consoleclaude/workflows/token-economics.md`. Fonte: Anthropic prompt-caching / pricing docs, riletti il 2026-10-04 dalla skill `claude-api` (cache 2026-09-25): prima di citare una cifra in un progetto, rileggila da lì o dalla doc.

## 1. Prompt caching — i numeri

| Voce | Costo (× prezzo input base) |
|------|------------------------------|
| Cache **read** | ~0.1× (≈90% sconto); **0.05×** su Opus 5.5, **0.025×** su Fable 5.1 / Mythos 5.1 |
| Cache **write** TTL 5 min | 1.25× |
| Cache **write** TTL 1h | 2× |
| Token non cachati (`input_tokens`) | 1× |

**Break-even** (al 0.1×): TTL 5 min si ripaga a **2 richieste** (1.25× write + 0.1× read = 1.35× vs 2× non cachato); TTL 1h serve **≥3 richieste** (2× + 0.2× = 2.2× vs 3×); con letture più economiche il punto scende. Il TTL 1h conviene solo per buchi di 5–60 minuti tra richieste che condividono il prefisso; un read rinnova il timer a costo zero, quindi richieste a meno di 5 minuti tengono caldo il TTL di default. **Fable 5.1:** per i buchi 5–60 min costa meno un keep-alive (stessa richiesta con `max_tokens: 0` poco prima della scadenza) del TTL 1h. Subagent e agenti dei workflow di Claude Code usano un bucket a parte: TTL 5 min di default, `subagentPromptCacheTtl: "1h"` per estenderlo.

**Prefisso minimo cachabile** (sotto la soglia il caching fallisce in silenzio, `cache_creation_input_tokens: 0`). **Non è monotono tra generazioni:**

| Modello | Minimo |
|---------|-------:|
| Opus 5.5, Opus 5, Fable 5, Fable 5.1, Sonnet 5.5 (rileggi la doc prima di fidarti) | 512 token |
| Opus 4.8, Sonnet 5, Sonnet 4.6, Sonnet 4.5 | 1024 token |
| Opus 4.7 | 2048 token |
| Opus 4.6, Opus 4.5, Haiku 4.5 | 4096 token |

**Verifica** (`response.usage`): `cache_read_input_tokens` (servito da cache, 0.1×), `cache_creation_input_tokens` (scritto, 1.25×/2×), `input_tokens` (full price). Totale prompt = somma dei tre. Se `cache_read` resta 0 su prefissi identici → silent-invalidator attivo.

## 2. Ordine di render del prefisso

`tools` → `system` → `messages`. Una modifica a posizione N invalida tutto ciò che sta a posizione ≥ N. In Claude Code: il preambolo (system + `CLAUDE.md` importato) è il prefisso; va tenuto byte-stabile.

### Checklist silent-invalidator (cerca questi nel prefisso)

| Pattern | Perché rompe il caching |
|---------|--------------------------|
| `datetime.now()` / `Date.now()` / `time.time()` | prefisso diverso ogni richiesta |
| `uuid4()` / `randomUUID()` / request ID alti nel contenuto | ogni richiesta è unica |
| `json.dumps(d)` senza `sort_keys=True` / iterazione di un `set` | serializzazione non deterministica |
| ID utente/sessione interpolato nel system prompt | prefisso per-utente, niente condivisione |
| Sezioni di system condizionali (`if flag: system += …`) | ogni combinazione = prefisso distinto |
| Set di tool variabile per utente/turno | i tool sono a posizione 0 → invalida tutto |

Fix: sposta la parte dinamica dopo l'ultimo breakpoint, rendila deterministica, o eliminala.

## 3. Prezzi modello (per 1M token)

| Modello | Input | Output | Cache read | Note |
|---------|------:|-------:|-----------:|------|
| Fable 5.1 | $10 | $50 | $0.25 | massima capacità; ZDR non disponibile salvo autorizzazione |
| Opus 5.5 | $4 | $20 | $0.20 | **default agentico** (`claude-opus-5-5`); effort di default `medium` |
| Opus 5 | $5 | $25 | — | generazione precedente, ancora servito |
| Sonnet 5.5 | $2 | $10 | $0.20 | bilanciato (`claude-sonnet-5-5`) |
| Haiku 4.5 | $1 | $5 | — | per i task meccanici delegati a un subagent quando il sidecar non c'è; contesto 200K |

Batch API: −50% su input e output. Fast mode (Opus 5.5, solo Claude API): $8/$40, cioè 2× lo standard.

**Routing:** i task meccanici (sintesi/classificazione/brief) vanno al **sidecar** (modello locale, gratis); sessioni e subagent restano sul modello di sessione. Il provider locale e il modello si scelgono in `models.json` (Ollama → `qwen3-coder:30b`, LM Studio → `qwen/qwen3-coder-30b`; override per progetto in `.claude/models.json`): vedi `.claude/consoleclaude/workflows/llm-provider.md`. Cambiare modello a metà sessione invalida la cache (cache model-scoped) → spawn di **subagent** (contesto separato), non switch in linea.

## 4. Batch API

−50% su tutti i token, asincrono (la maggior parte < 1h, max 24h), fino a 100k richieste/256MB per batch. Per job non latency-sensitive **che girano su Claude**. I task già sul modello locale (`classify_task`, `summarize_diff`, `extract_tech_debt`) restano locali e gratuiti → Batch non si applica.

## 5. Dove agisce l'economia dei token in un progetto

- **Preambolo fisso**: la regione gestita di `CLAUDE.md` (`INDEX.md` e i moduli del livello 1) più eventuali file globali dell'utente. Tieni il catalogo prosa fuori dal preambolo; per cercare un modulo o un brano di codice usa `mcp__library-router__search` (se non c'è, Grep e Glob).
- **Hook**: `SessionStart` inietta mode e ultima sessione come `additionalContext` **una volta** per sessione (stabile intra-sessione, OK per il caching). La memoria (`MEMORY.md`) entra dalla regione di `CLAUDE.md` e non si inietta due volte. Il circuit-breaker riscrive o nega l'input dei comandi (non il prefisso) → nessun impatto cache. Vedi `.claude/consoleclaude/workflows/enforcement-hooks.md`.
- **Diagnosi**: `/token-cost` legge `cache_read_input_tokens`/`cache_creation_input_tokens`/`input_tokens` dai transcript e ne deriva hit-rate, chiamate al sidecar e proposte.

## 6. Pattern

- **Audit della cache**: cerca nel prefisso `datetime.now()`/`Date.now()`, UUID, JSON non ordinato, un set di tool variabile: spostali in coda o rendili deterministici.
- **Dieta del preambolo**: `/context-prune` per la sessione corrente; per cercare nel progetto e nei moduli usa `mcp__library-router__search` (se non c'è, Grep e Glob) invece di caricare i file interi. Misura: `node tools/measure-region.js` (Haiku, due giri). 2026-10-20 (dettaglio in `-reference`): regione da 16 959 a 11 427 token. Stesso giorno, addon `ai`/`style` a extra: regione 9 821, totale 41 360; senza regione ~31 539 (pavimento di `claude`). Il target ≤ ~32k sul totale è quel pavimento.
- **Routing**: il modello locale e il provider si scelgono in `models.json` (per progetto in `.claude/models.json`; vedi `.claude/consoleclaude/workflows/llm-provider.md`). Il modello dei Dot lo sceglie la console con il profilo.
- **Coda locale**: nella console, **Elabora in locale** fa girare in serie, sul modello locale, i job meccanici del progetto (sintesi del diff, debito tecnico, sintesi della sessione) e scrive i risultati sotto `.claude/`. Parte solo dal pulsante; con il provider spento il pulsante è disattivato o il job è `skipped`, mai un modello Claude al suo posto.
- **Diagnosi**: `/token-cost` (hit-rate, dimensione del preambolo, chiamate al sidecar, «policy non rispettata»), `/rtk-check` (output di bash).

## 7. Leve già attive (contesto)

RTK (−60/90% output bash), circuit-breaker (blocca file enormi), moduli 2-tier (`X.md` + `X-reference.md` on-demand), snippet compressi (−60% sul codice template), memoria persistente (niente ri-derivazione post-`/clear`), offload sul modello locale (task meccanici a costo zero), library-router (cerca nel progetto senza leggere i file interi). Vedi `.claude/consoleclaude/stacks/rtk.md` e `.claude/consoleclaude/workflows/enforcement-hooks.md`.

## 8. KPI (ConsoleClaude, 2026-10-20)

Metodo: `node tools/measure-region.js` (Haiku, `claude -p "rispondi ok"`, somma di `input` + `cache_creation` + `cache_read`, due giri). Hit-rate, $/sessione e chiamate sidecar si leggono per progetto con `/token-cost` (`cache-audit.js`); non c'è un unico numero di prodotto.

| Voce | Prima (dieta in-file) | Dopo (addon `ai`/`style` a extra) |
|------|----------------------:|----------------------------------:|
| Regione `@` CLAUDE.md | 11 427 | 9 821 (−14%) |
| Totale probe | 42 963 | 41 360 |
| File `@` importati | 12 | 10 |
| Senza regione (pavimento) | ~31 540 | 31 539 |
| Tetto default Media | — | $1.50 / sessione (`budgetUsd`) |
| Auto-handoff | consiglio | file in `dots-exchange` se rapporto > 4000 char |
| Sidecar | testo | `sidecar.policy` in `/token-cost` (`ok` / `violated` / `no-data`) |
| Coda locale | — | pulsante **Elabora in locale**, $0, niente Claude |

Hit-rate cache, $/sessione reale e chiamate sidecar: `/token-cost` sul progetto (non un unico numero di prodotto). Comando di misura: `node tools/measure-region.js`.
