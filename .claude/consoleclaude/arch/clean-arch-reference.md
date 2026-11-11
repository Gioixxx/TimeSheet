# Arch: Clean Architecture + DDD — Reference
> **Revisione doc:** 2026-04

> Dettagli: schema degli strati, regole di dipendenza, un esempio GIUSTO/SBAGLIATO sui domain event, regole multi-tenant e albero delle cartelle (.NET).

## Struttura strati completa

```
Domain (entità, value objects, domain events)
    ↑
Application (use cases, CQRS commands/queries, interfacce)
    ↑
Infrastructure (implementazioni: DB, email, HTTP client)
    ↑
Presentation (API controllers, UI)
```

**Regola aurea:** le frecce puntano solo verso l'interno. `Infrastructure` dipende da `Application`, mai il contrario.

## Domain Events — esempi

```csharp
// GIUSTO: l'ordine emette un evento
order.PlaceOrder(); // internamente: AddDomainEvent(new OrderPlacedEvent(...))

// SBAGLIATO: l'handler chiama direttamente il servizio email
await _emailService.SendConfirmation(order); // no, questo va in un EventHandler
```

## Multi-tenancy

- Ogni query al DB **deve** includere il filtro `TenantId`. Nessuna eccezione.
- Il `TenantId` si ricava sempre dal contesto autenticato (`ICurrentTenantService`), mai dal body della request.
- Le migration devono includere `TenantId` come colonna non nullable con default constraint.

## Struttura cartelle target

```
src/
  ProjectName.Domain/
    Entities/
    ValueObjects/
    Events/
    Interfaces/        ← solo interfacce repository
  ProjectName.Application/
    Features/
      Orders/
        Commands/
        Queries/
        Validators/
  ProjectName.Infrastructure/
    Persistence/
      Repositories/
      Configurations/  ← EF Core config
    Services/          ← implementazioni servizi esterni
  ProjectName.API/
    Controllers/
    Middleware/
```
