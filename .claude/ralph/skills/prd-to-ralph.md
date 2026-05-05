---
name: ralph
description: "Converti PRD in formato prd.json per il sistema Ralph. Usa quando hai un PRD esistente e vuoi avviare uno sviluppo autonomo. Trigger: converti questo prd, trasforma in ralph, crea prd.json, ralph json."
---

# Ralph PRD Converter

Converte un PRD (markdown o testo) nel file `ralph/prd.json` per l'esecuzione autonoma.

---

## Il lavoro

1. Ricevi la descrizione della feature (o un PRD esistente)
2. Chiedi le informazioni mancanti (stack, build command, libs necessarie)
3. Genera `ralph/prd.json` completo e pronto all'uso

**Importante:** Non iniziare l'implementazione — solo genera il JSON.

---

## Schema prd.json

```json
{
  "project": "NomeProgetto",
  "branchName": "ralph/nome-feature-kebab",
  "description": "Descrizione sintetica della feature",

  "stack": "dotnet",
  "libs": [
    "arch/clean-arch.md",
    "stacks/dotnet.md",
    "snippets/dotnet-patterns.md"
  ],

  "buildCommand": "dotnet build src/NomeProgetto/NomeProgetto.csproj",
  "testCommand": "dotnet test",

  "userStories": [
    {
      "id": "US-001",
      "title": "Titolo storia",
      "description": "Come [utente], voglio [feature] per [beneficio]",
      "acceptanceCriteria": [
        "Criterio verificabile concreto",
        "Il build passa"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Campi obbligatori da raccogliere

Se non presenti nel PRD, chiedi:

**Stack** — quale tecnologia usa il progetto?

```
A. dotnet (C# / .NET Core 8)
B. spring (Java / Spring Boot)
C. nextjs (Next.js / React)
D. nestjs (NestJS / Node.js)
E. fastapi (Python / FastAPI)
F. angular (Angular 17+)
G. altro: [specifica]
```

**Build command** — come si compila il progetto?

```
A. dotnet build [path al .csproj]
B. mvn clean package
C. npm run build
D. altro: [specifica]
```

**Libs da caricare** — seleziona quelle rilevanti per questa feature:

```
Architettura:
  A. arch/clean-arch.md — per progetti con Clean Architecture
  B. arch/api-design.md — per features con endpoint REST

Snippets:
  C. snippets/dotnet-patterns.md
  D. snippets/spring-patterns.md
  E. snippets/angular-patterns.md
```

---

## Libs consigliate per stack

| Stack | Libs raccomandate |
| --- | --- |
| dotnet | `arch/clean-arch.md`, `stacks/dotnet.md`, `snippets/dotnet-patterns.md` |
| spring | `arch/clean-arch.md`, `stacks/spring.md`, `snippets/spring-patterns.md` |
| nextjs | `stacks/nextjs.md` |
| nestjs | `arch/clean-arch.md`, `stacks/nestjs.md` |
| fastapi | `stacks/fastapi.md` |
| angular | `stacks/angular.md`, `snippets/angular-patterns.md` |

Se il progetto espone API REST, aggiungi sempre `arch/api-design.md`.

---

## Regola n.1: Dimensione delle storie

**Ogni storia deve essere completabile in UNA iterazione Ralph (un context window).**

### Storie giuste:
- Aggiungere una colonna al DB e la migration
- Creare un endpoint REST con service e repository
- Aggiungere un componente UI a una pagina esistente
- Implementare un handler CQRS completo

### Troppo grandi (spezza):
- "Implementa il modulo ordini" → separa: entity/migration, service, endpoint, UI
- "Aggiungi autenticazione" → separa: entity, JWT, login endpoint, guard, UI
- "Refactoring del layer service" → separa per ogni service

**Regola pratica:** Se non riesci a descrivere la storia in 2-3 frasi, è troppo grande.

---

## Ordine delle storie: dipendenze prima

Ordina per priorità seguendo le dipendenze:

1. **Domain / Entità** (entity, value objects, domain events)
2. **Infrastructure** (migration DB, repository implementation)
3. **Application** (command, query, handler, validator)
4. **Presentation** (endpoint, controller)
5. **UI** (componente, form, lista)

Una storia UI non può essere priority 1 se dipende da una migration non ancora fatta.

---

## Criteri di accettazione: verificabili

Ogni criterio deve essere qualcosa che Ralph può **verificare**, non qualcosa di vago.

**Buoni (verificabili):**
- `"Aggiunta colonna status alla tabella orders con default 'pending'"`
- `"Endpoint POST /api/v1/orders ritorna 201 con body dell'ordine"`
- `"Il build passa"`
- `"I test passano"`

**Cattivi (vaghi):**
- `"Funziona correttamente"`
- `"Buona UX"`
- `"Gestisce gli edge case"`

**Includere sempre:**
- `"Il build passa"` — in ogni storia
- `"I test passano"` — per storie con logica testabile

---

## Archivio run precedenti

Prima di scrivere un nuovo `prd.json`, verifica se esiste già uno da una feature diversa:

1. Leggi il `prd.json` attuale (se esiste)
2. Se `branchName` è diverso E `progress.txt` ha contenuto:
   - Crea `archive/YYYY-MM-DD-nome-feature/`
   - Copia `prd.json` e `progress.txt` nell'archivio
   - Resetta `progress.txt` con intestazione vuota

---

## Checklist prima di salvare

- [ ] Stack e libs specificati correttamente
- [ ] Build command verificato (esiste il file/script?)
- [ ] Ogni storia è completabile in una iterazione
- [ ] Storie ordinate per dipendenza (domain → infra → app → UI)
- [ ] Ogni storia ha `"Il build passa"` nei criteri
- [ ] Tutti i criteri sono verificabili (non vaghi)
- [ ] Nessuna storia dipende da una storia con priorità maggiore
- [ ] Run precedente archiviato se necessario
