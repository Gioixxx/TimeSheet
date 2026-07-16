# /token-cost — Diagnostica costo token della sessione

Misura quanto sta cachando il prefisso e quanto pesa il preambolo sempre caricato, poi propone tagli concreti. Solo diagnostica — non modifica file (come `/rtk-check`).

## Input

- `usage` dal transcript della sessione: `cache_read_input_tokens`, `cache_creation_input_tokens`, `input_tokens`, `output_tokens` (stessi campi sommati da `scripts/statusline/statusline.js`)
- `CLAUDE.md` del progetto + i `@.claude/libs/` attivi (dimensione del preambolo fisso)
- `~/.claude/CLAUDE.md` → `RTK.md`, `RALPH.md` (preambolo globale importato)
- `.claude/active-mode.json` / `mode-override.md` — moduli extra del mode
- Modello in uso (per i prezzi: Opus $5/$25, Sonnet $3/$15, Haiku $1/$5 per 1M)

## Regole

- **Cache hit-rate** = `cache_read / (cache_read + cache_creation + input)` sugli ultimi turni. < ~50% su turni ripetuti ⇒ probabile silent-invalidator (vedi `workflows/token-economics.md` §checklist).
- **Dimensione preambolo**: stima i token di `CLAUDE.md` + globali; segnala il catalogo prosa se ancora inline (candidato a `CATALOG.md`).
- **Routing**: se la sessione è dominata da task meccanici (sintesi, classificazione, brief), segnala quelli offloadabili su **Ollama sidecar** (locale, gratis; fallback Haiku se offline). Modelli di default in `models.json`.
- Non proporre rimozioni dello stack primario o di `workflows/iterative-dev.md`.
- Niente modifiche: solo report.

## Procedura

1. Esegui `node scripts/analysis/cache-audit.js` (transcript del progetto corrente; `--last N` per più turni, `--newest` per il transcript globale più recente) → hit-rate per turno, media, trend di `input_tokens` (non cachato). Se node manca, estrai `usage` a mano dal transcript.
2. Stima la dimensione del preambolo fisso (progetto + globali + mode).
3. Cerca silent-invalidator nel prefisso (date, UUID, JSON non ordinato, set di tool variabile).
4. Identifica candidati: catalogo inline, moduli ridondanti (`X.md`+`X-reference.md`), task offloadabili su Ollama.

## Output

```
/token-cost

CACHE
  Hit-rate (ultimi 3 turni):  82%   ✅ (read 41k / write 2k / fresh 7k)
  Trend input non cachato:    ↓ stabile
  Silent-invalidator:         nessuno   (oppure: ⚠️ data in MEMORY.md alta nel prefisso)

PREAMBOLO FISSO (~token)
  CLAUDE.md progetto:   ~3.8k   (catalogo prosa inline → -1.8k spostandolo in CATALOG.md)
  RTK.md + RALPH.md:    ~2.1k
  Mode (architect):     +0.9k

ROUTING
  Task meccanici (sintesi/classificazione) → Ollama sidecar  (locale, gratis; fallback Haiku)

AZIONI RACCOMANDATE
  1. Sposta il catalogo in CATALOG.md (on-demand) → -1.8k token/sessione
  2. /context-prune: 2 moduli ridondanti per il task corrente
  3. Offloada le sintesi ricorrenti sui tool ollama-sidecar
```
