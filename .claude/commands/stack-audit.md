# /stack-audit — Verifica coerenza stack e contesto caricato

Confronta lo stack reale rilevato dal progetto con i moduli claude-libs caricati nel CLAUDE.md. Evidenzia mismatch, moduli mancanti o ridondanti con suggerimenti pratici.

## Input

Leggi dal progetto corrente:
- `CLAUDE.md` (o `.claude/CLAUDE.md`) — moduli caricati via `@.claude/libs/`
- File di progetto per rilevare lo stack: `package.json`, `*.csproj`, `pom.xml`, `build.gradle`, `go.mod`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`
- `@.claude/memory/MEMORY.md` per contesto aggiuntivo

## Procedura

### Step 1 — Rileva stack reale
Esamina i file di progetto e ricava lo stack/framework principale:

| File | Stack rilevato |
|------|---------------|
| `package.json` con `"next"` | nextjs |
| `package.json` con `"@angular/core"` | angular |
| `package.json` con `"@nestjs/core"` | nestjs |
| `package.json` con `"electron"` | electron |
| `package.json` con `"react-native"` / `expo` | react-native |
| `*.csproj` o `*.sln` | dotnet |
| `pom.xml` o `build.gradle` | spring |
| `go.mod` | go |
| `pyproject.toml` / `fastapi` in deps | fastapi |
| `*.xaml` + `*.csproj` | wpf |

Segnala quando il file di rilevamento non è trovato.

### Step 2 — Estrai moduli caricati
Dal CLAUDE.md del progetto, raccogli tutti i path `@.claude/libs/...` attivi.

### Step 3 — Confronta con bundle consigliato
Usa il bundle raccomandato per lo stack rilevato come baseline:

- **dotnet**: `arch/clean-arch.md`, `arch/api-design.md`, `stacks/dotnet.md`, `snippets/dotnet-patterns.md`, `workflows/iterative-dev.md`, `workflows/testing.md`
- **spring**: `arch/clean-arch.md`, `stacks/spring.md`, `snippets/spring-patterns.md`, `workflows/iterative-dev.md`, `workflows/testing.md`
- **angular**: `stacks/angular.md`, `snippets/angular-patterns.md`, `stacks/style-system.md`, `workflows/iterative-dev.md`, `workflows/testing.md`
- **nextjs**: `stacks/nextjs.md`, `snippets/nextjs-patterns.md`, `stacks/style-system.md`, `workflows/iterative-dev.md`, `workflows/testing.md`
- **react-native**: `stacks/react-native.md`, `snippets/react-native-patterns.md`, `stacks/style-system.md`, `workflows/iterative-dev.md`
- **nestjs**: `arch/clean-arch.md`, `stacks/nestjs.md`, `snippets/nestjs-patterns.md`, `workflows/iterative-dev.md`, `workflows/testing.md`
- **fastapi**: `stacks/fastapi.md`, `snippets/fastapi-patterns.md`, `workflows/iterative-dev.md`, `workflows/testing.md`
- **wpf**: `stacks/wpf.md`, `snippets/wpf-patterns.md`, `workflows/iterative-dev.md`
- **electron**: `arch/clean-arch.md`, `stacks/electron.md`, `stacks/component-libs.md`, `workflows/iterative-dev.md`
- **go**: `stacks/go.md`, `snippets/go-patterns.md`, `workflows/iterative-dev.md`, `workflows/testing.md`

### Step 4 — Identifica mismatch
- **Mancanti**: nel bundle consigliato ma assenti dal CLAUDE.md → suggerisci di aggiungere
- **Extra**: nel CLAUDE.md ma non nel bundle → verifica se intenzionali o rimossi per errore
- **Stack errato**: il CLAUDE.md carica moduli di uno stack diverso da quello rilevato → segnala

## Regole

- Non modificare CLAUDE.md — solo analisi e suggerimenti
- Se lo stack non è rilevabile con certezza, indicalo come ⚠️ e chiedi conferma
- Un modulo "extra" non è necessariamente un problema — chiediti se è intenzionale
- Priorità segnalazioni: snippet mancanti e workflow core prima di trasversali (security, logging)
- Max 25 righe di output

## Output

```
/stack-audit — <nome progetto>

Stack rilevato: dotnet  (da src/MyApp.csproj)
Moduli caricati: 7

MANCANTI (nel bundle consigliato, assenti dal CLAUDE.md):
  ⚠️  snippets/dotnet-patterns.md  → aggiungi per template CQRS/Handler/Validator
  ⚠️  workflows/testing.md         → aggiungi per strategia test

PRESENTI E CORRETTI: ✅ 5 moduli allineati al bundle

EXTRA (caricati ma non nel bundle base):
  ℹ️  stacks/docker.md             → ok se il progetto usa Docker
  ℹ️  stacks/auth-patterns.md      → ok se il progetto ha autenticazione

SUGGERIMENTO:
  Aggiungi al CLAUDE.md:
    @.claude/libs/snippets/dotnet-patterns.md
    @.claude/libs/workflows/testing.md
```
