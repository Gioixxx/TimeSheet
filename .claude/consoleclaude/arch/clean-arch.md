---
triggers: clean architecture | ddd | regola di dipendenza | layer dominio
---
# Arch: Clean Architecture + DDD — Regole
> **Revisione doc:** 2026-04

## Principio
Separazione a strati con dipendenze solo verso l'interno: Domain ← Application ← Infrastructure ← Presentation.

## Regole
- Le frecce puntano solo verso l'interno; Infrastructure dipende da Application, mai il contrario
- Mai logica di business in Controller o Handler — delegare al Domain o Domain Service
- Entity senza attributi ORM — nessun riferimento al DB nel Domain
- Value Objects immutabili — solo factory methods o costruttori
- Aggregate Root è l'unico punto di accesso all'aggregato
- Ogni Use Case fa una sola cosa (handler ≤ 40 righe)
- Domain events per comunicazione tra aggregati — mai chiamate dirette tra aggregate root
- Multi-tenant: ogni query DEVE filtrare per TenantId da `ICurrentTenantService`, mai dal body

## Pattern
| Layer | Naming esempio |
|-------|---------------|
| Entity | `Order`, `User`, `Tenant` |
| Value Object | `Money`, `Email`, `Address` |
| Repository interface | `IOrderRepository` |
| Repository impl | `OrderRepository` (in Infrastructure) |
| Use Case / Handler | `CreateOrderCommandHandler` |
| Command | `CreateOrderCommand` |
| Query | `GetOrderByIdQuery` |
| Domain Event | `OrderCreatedEvent` |

## Reference → `.claude/consoleclaude/arch/clean-arch-reference.md`
