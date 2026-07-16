# /rtk-check — Diagnostica RTK

## Input
`rtk --version`, `rtk init --show`, `rtk gain`, `rtk gain --graph`, `rtk discover --since 7`, `rtk session`.

## Regole
- Se non installato, mostra istruzioni da `stacks/rtk.md`
- Se hook non attivo, suggerisci `rtk init -g`
- Elenca top 5 comandi non ottimizzati
- Solo diagnostica — non modificare

## Output
Status, risparmio token, grafico, opportunità mancate, adozione sessioni, azioni raccomandate
