# Template Documentazione Tecnica

> **Compressione:** struttura template. Non ha un reference: il template è già completo.

## API Endpoint

````
### [METODO] [PATH]
[Descrizione 1 frase]
**Autenticazione**: [Bearer JWT / API Key / Nessuna]

**Parametri path**
| Nome | Tipo | Descrizione |

**Parametri query** *(opzionale)*
| Nome | Tipo | Default | Descrizione |

**Request body** *(POST/PUT/PATCH)*
```json
{ "campo": "tipo — descrizione" }
```

**Response 200** → JSON con campi
**Errori** → Tabella: 400, 401, 403, 404, 409, 500
**Esempio** → HTTP request completa con headers
````

Quando: documentare endpoint REST.
- Includere sempre autenticazione, errori possibili, esempio

## Componente UI

```
### [NomeComponente]
[Descrizione 1 frase]

**Props**
| Nome | Tipo | Default | Richiesto | Descrizione |

**Events / Output**
| Nome | Payload | Quando |

**Esempio** → JSX/TSX o Angular template
```

Quando: documentare componenti UI.
- Props tabella con tipo, default, richiesto

## Service / Use Case

```
### [NomeService]
**Responsabilità**: [1 frase — cosa gestisce]

**Dipendenze**: [Repository, Client esterni]

**Metodi pubblici**
#### `nomeMetodo(param: Tipo): Promise<T>`
- **Descrizione**: [cosa fa]
- **Precondizioni**: [cosa deve essere vero]
- **Side effect**: [cosa scrive/modifica]
- **Eccezioni**: `[Exception]` — quando [condizione]

**Note architetturali** *(solo se non ovvio)*
```

Quando: documentare service layer.
- Solo metodi pubblici, non implementazione interna

## Funzione / Utility

TypeScript:
```typescript
/**
 * [Descrizione — verbo all'infinito]
 * @param - [descrizione]
 * @returns [descrizione]
 * @throws {[Error]} [quando]
 * @example const result = fn('input') // 'output'
 */
```

Python:
```python
def fn(param: Tipo) -> Tipo:
    """[Descrizione]
    Args: param: [descrizione]
    Returns: [descrizione]
    Raises: [Exception]: [quando]
    Example: >>> fn('input') 'output'
    """
```

Java/C#:
```java
/**
 * [Descrizione]
 * @param param [descrizione]
 * @return [descrizione]
 * @throws [Exception] [quando]
 */
```

Quando: JSDoc/docstring per funzioni pure o utility.

## README Sezione Modulo

```
## [Nome Modulo]
[Scopo 1-2 righe — cosa risolve]

**Exports principali**
- `[Nome]` — [descrizione]

**Setup / Dipendenze** → comandi o config
**Esempio minimo** → codice uso base
**Limitazioni note** *(solo se rilevanti)*
```

## Breaking Change

```
### ⚠️ Breaking Change: [Titolo]
**Versione**: [v2.0.0]  **Data**: [YYYY-MM-DD]

**Cosa è cambiato** → [cosa non funziona più]
**Perché** → [ragione concreta: requisito, sicurezza, deprecazione]

**Come migrare**
Prima: // codice vecchio
Dopo: // codice nuovo

**File coinvolti**: [lista path]
```

Quando: cambiamenti incompatibili con versioni precedenti.
- Sempre "prima/dopo" con codice concreto
