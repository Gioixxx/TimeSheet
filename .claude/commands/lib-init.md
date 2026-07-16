# /lib-init — Setup guidato claude-libs nel progetto

Wizard conversazionale per configurare il progetto in modo dichiarativo (`workspace.json` + reconcile).

## Flusso
1. **Rileva lo stack** dai marker nel progetto:
   - `*.csproj`/`*.sln` → `dotnet` · `go.mod` → `go` · `pom.xml`/`build.gradle` → `spring`
   - `angular.json` → `angular` · `package.json` deps → `nextjs`/`nestjs`/`react-native` (ispeziona `dependencies`)
2. **Proponi** stack rilevato + moduli di default da `.claude/libs/schemas/stack-bundles.json` + feature opzionali (`memoryOllama`, `libraryRouter`). Chiedi conferma/aggiustamenti.
3. **Scrivi/merge** `workspace.json` (preserva campi esistenti): `name`, `stack`, `kit` (`custom` se assente), `claudeLibsVersion` da `.claude/libs/VERSION`, `buildCommand`/`testCommand`, `createdAt`, `features`, `modules`.
4. **Esegui reconcile**: `powershell -File .claude/libs/scripts/setup/reconcile.ps1 -Path .` (fallback non-Windows: `bash .claude/libs/scripts/setup/init-project.sh . <stack>`).

## Output
Riepiloga stack, moduli e feature applicate; suggerisci `/context` per verificare i moduli caricati.
