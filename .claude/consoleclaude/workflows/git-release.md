---
triggers: commit | tag | release | rilascio | changelog | versione
---
# Workflow: Git e rilascio — Regole

> **Revisione doc:** 2026-10

## Principio

Un commit racconta una modifica sola e un tag dice «questa versione è buona»: si mette solo quando lo è. Ciò che è già pubblicato non si riscrive.

## Regole

- **Messaggio di commit**: `type(scope): descrizione`, nella lingua del progetto. Tipi: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`. La descrizione dice il perché, non il cosa
- **Trailer e firme**: nessuno (niente `Co-Authored-By`, `Signed-off-by` e simili); la console rifiuta il commit che li contiene
- **Un commit, una modifica**: se il diff fa due cose, si spezza in due commit
- **Prima del tag**: suite di test verde e albero pulito (`git status` senza modifiche)
- **Tag annotato** (`git tag -a vX.Y.Z -m "..."`), mai leggero, sul commit che ha passato i test
- **Versione in un solo file**: gli altri la leggono da lì, nessuno la ripete a mano
- **CHANGELOG**: durante il lavoro le voci stanno in `[Unreleased]`; alla release quella sezione diventa la versione nuova, con la data
- **Mai `--no-verify`**: se un hook di commit fallisce, si corregge la causa
- **Un tag già pubblicato non si sposta e non si cancella**: un errore si corregge con una versione nuova
- **Push, merge e tag solo su richiesta dell'utente**: non partono da soli; il commit segue il flusso del progetto (nella console è il passo finale del Dot Git)

## Pattern

- **Messaggio**: `fix(auth): rifiuta il token scaduto invece di rinnovarlo`, non `fix: modifiche`
- **Release**: aggiorna la versione → promuovi `[Unreleased]` → suite verde → commit `chore(release): vX.Y.Z` → tag annotato → push del ramo e del tag
- **Pre-release**: `X.Y.Z-rc.N` o `X.Y.Z-dev.N`, con lo stesso tag annotato
