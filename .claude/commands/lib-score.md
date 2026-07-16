# /lib-score — Health score della libreria claude-libs

Esegue `lib_score.py` e riassume lo stato di salute della libreria (per chi sviluppa claude-libs).

## Input

Nessuno. Lancia lo script nelle libs collegate:
`python .claude/libs/scripts/validate/lib_score.py` (oppure `--json` per output strutturato).

## Regole

- Non rieseguire i singoli validator a mano: lo script aggrega già `validate/validate.sh` (con fallback ai validator Python) e la freschezza di `catalog.json`.
- Se il catalogo è obsoleto, suggerisci `python .claude/libs/scripts/release/generate-catalog.py`.
- Se ci sono errori (exit 1), elencali e indica il validator/file da correggere.

## Output

Punteggio `0-100` + voto `A-F`, conteggio errori/warning, stato catalogo, e — se ci sono
errori — la lista dei rilievi con il file da sistemare. Suggerisci `--badge` per il README.
