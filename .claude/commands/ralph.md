# /ralph — Prepara sessione Ralph

Prepara una sessione di sviluppo autonomo Ralph: genera o aggiorna il `prd.json` e verifica che tutto sia pronto per avviare il loop.

## Istruzioni

### Se l'utente ha già una descrizione della feature

1. Fai 3-5 domande di chiarimento con opzioni letterate:
   - Stack del progetto (dotnet, spring, nextjs, nestjs, fastapi, angular)
   - Build command del progetto
   - Scope della feature (cosa include, cosa NON include)
   - Ordine di priorità delle dipendenze

2. Genera `ralph/prd.json` seguendo il formato corretto (vedi sotto)

3. Crea `ralph/bigplan.md` con una checklist ad alto livello del piano

4. Crea `ralph/progress.txt` vuoto (solo intestazione)

### Se l'utente vuole convertire un PRD esistente

Carica `@.claude/libs/ralph/skills/prd-to-ralph.md` e seguilo.

### Se l'utente vuole avviare Ralph su un prd.json già esistente

1. Leggi `@ralph/prd.json`
2. Verifica che tutti i campi obbligatori siano presenti (`stack`, `libs`, `buildCommand`)
3. Mostra un riepilogo: quante storie, quante completate, prossima da fare
4. Conferma che `.claude/libs/` esiste nel progetto
5. Mostra il comando per avviare:

```powershell
# Singola iterazione
.\ralph\ralph-once.ps1

# Loop completo
.\ralph\ralph.ps1 -Iterations [N]
```

## Formato prd.json

```json
{
  "project": "NomeProgetto",
  "branchName": "ralph/nome-feature",
  "description": "Descrizione sintetica",
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
      "acceptanceCriteria": ["Criterio verificabile", "Il build passa"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Libs raccomandate per stack

- **dotnet** → `arch/clean-arch.md`, `stacks/dotnet.md`, `snippets/dotnet-patterns.md`
- **spring** → `arch/clean-arch.md`, `stacks/spring.md`, `snippets/spring-patterns.md`
- **nextjs** → `stacks/nextjs.md`
- **nestjs** → `arch/clean-arch.md`, `stacks/nestjs.md`
- **fastapi** → `stacks/fastapi.md`
- **angular** → `stacks/angular.md`, `snippets/angular-patterns.md`

Aggiungi `arch/api-design.md` se la feature espone endpoint REST.

## Checklist pre-avvio

Prima di dichiarare Ralph pronto, verifica:

- [ ] `ralph/prd.json` presente e compilato con `stack`, `libs`, `buildCommand`
- [ ] `.claude/libs/` presente nel progetto (symlink a claude-libs)
- [ ] `.claude/memory/MEMORY.md` presente (consigliato — usa `/remember` per popolarlo)
- [ ] Ogni storia è completabile in una iterazione (non troppo grande)
- [ ] Storie ordinate per dipendenza (domain → infra → app → UI)
- [ ] Ogni storia ha `"Il build passa"` nei criteri
- [ ] Git pulito (commit prima di avviare)

## Regole

- Non avviare Ralph — prepara solo il terreno
- Se qualcosa manca, crea i file necessari o segnala cosa fare
- Se le storie sembrano troppo grandi, proponi come spezzarle
