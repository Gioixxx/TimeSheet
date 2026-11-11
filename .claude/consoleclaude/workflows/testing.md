---
triggers: test unitari | test strategy | coverage | mock dipendenze
---
# Workflow: Strategia di Test — Regole

> **Revisione doc:** 2026-04

## Principio

Testa il comportamento, non l'implementazione. Se rinominare un metodo privato rompe un test, quel test testa l'implementazione. Distribuisci i test sulla piramide: molti unit, moderati integration, pochi e2e.

## Regole

- **Co-location**: test vicino al file testato (`.test.ts` / `_test.py`) — non in cartella `tests/` separata (eccetto integration), salvo una cartella di test già in uso nel progetto
- **Naming**: `dovrebbe [comportamento] se [condizione]` — niente `test1` o `funziona`
- **Mock**: solo dipendenze esterne (DB, HTTP, filesystem) — niente mock di logica interna
- **Dati di test**: costanti esplicite in cima al file — niente magic values inline
- **Asserzioni**: una asserzione logica per test — se servono 5 `expect`, spezza in 2 test
- **Coverage target**: 80% service/utility, 60% component — non inseguire il 100%
- **Post-bug fix**: scrivi il test che avrebbe catturato il bug prima del fix

## Pattern

- **Next.js**: Vitest + Testing Library, co-locato, MSW per mock API
- **Angular**: Jest + Spectator, mock dei service, test del DOM
- **NestJS**: Jest + `@nestjs/testing`, mock repository con `getRepositoryToken`
- **FastAPI**: Pytest + httpx, test async con `AsyncClient`
- **React Native**: Jest + Testing Library RN, `fireEvent.press`, `getByTestId`
- **Electron**: processo principale con il test runner di Node, renderer con DOM finto o Playwright

## Reference → `.claude/consoleclaude/workflows/testing-reference.md`
