# /test — Genera Test

Genera test per il codice selezionato o il file corrente, adatti allo stack e al tipo di componente.

## Istruzioni

1. Leggi il codice selezionato o il file aperto nel contesto
2. Identifica lo stack (Angular, Next.js, React Native, NestJS, FastAPI, Spring)
3. Identifica il tipo di unità da testare (service, component, hook, endpoint, utility)
4. Carica le convenzioni del progetto da `@.claude/memory/conventions.md` se esiste

**Context7 (se disponibile):** per API del framework di test:

```text
use context7 to get documentation for [jest / vitest / pytest / @testing-library/react]
```

## Strategia per stack

**Angular** — Jest + Testing Library + Spectator:
- Component: render, input/output, interazione utente
- Service: mock `HttpClient`, verifica chiamate e trasformazioni
- Guard: mock `Router`, verifica redirect

**Next.js** — Vitest + Testing Library + MSW:
- Server Component: render con `renderToString`, verifica output HTML
- Client Component: interazione utente, stato, eventi
- Server Action: mock `db`, verifica validazione e side effect
- Route Handler: `Request` mock, verifica response status e body

**React Native** — Jest + Testing Library React Native:
- Component: render, press event, FlatList items
- Hook: `renderHook`, verifica stato e chiamate
- Store Zustand: test azioni e selettori in isolamento

**NestJS** — Jest + `@nestjs/testing`:
- Service: mock repository, verifica eccezioni e ritorno
- Controller: `createTestingModule`, mock service, verifica status code
- Guard: mock `ExecutionContext`, verifica `canActivate`

**FastAPI** — Pytest + `httpx.AsyncClient`:
- Endpoint: client asincrono, verifica status e body
- Service: mock db session, verifica eccezioni
- Schema: validazione Pydantic con input validi e invalidi

**Spring** — JUnit 5 + Mockito + MockMvc:
- Service: `@ExtendWith(MockitoExtension.class)`, mock repository
- Controller: `MockMvc`, verifica status e JSON response

## Template output

Per ogni test generato, includi:

1. **Setup** — import, mock necessari, dati di test
2. **Test happy path** — comportamento atteso con input valido
3. **Test edge case** — input limite, lista vuota, valore nullo
4. **Test error case** — input non valido, eccezione attesa, 404/401

## Formato

```
describe('[NomeUnità]', () => {
  describe('[metodo/scenario]', () => {
    it('dovrebbe [comportamento atteso]', ...)
    it('dovrebbe lanciare errore se [condizione]', ...)
  })
})
```

## Regole

- Test che documentano il comportamento atteso — niente test banali che testano l'implementazione
- Un test = una asserzione logica — niente `it` con 10 `expect`
- Mock solo le dipendenze esterne (DB, HTTP, file system) — niente mock di logica interna
- Nomi in italiano: "dovrebbe restituire l'utente se esiste" — chiari per chi legge il test fallito
- Non testare framework o librerie — testare il codice del progetto
- Se il codice non è testabile (dipendenze hardcoded, side effect nascosti), segnalarlo prima di generare i test
