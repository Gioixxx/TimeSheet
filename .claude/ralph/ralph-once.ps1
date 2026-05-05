# Ralph - Singola iterazione autonoma
# Uso: .\ralph-once.ps1 [-ProjectDir "C:\path\al\progetto"] [-Json]
#
# -Json   Emette solo JSON su stdout (RalphOnceOutput); output Claude su stderr.
#         Schema: docs/script-outputs.md
# Prerequisiti:
#   - prd.json compilato nella cartella ralph/ del progetto
#   - .claude/libs/ symlink a claude-libs (creato da init-project.sh)
#   - .claude/memory/ inizializzato (opzionale ma consigliato)

param(
    [string]$ProjectDir = "",
    [string]$ClaudeLibsPath = "",
    [switch]$Json,
    [switch]$Step
)

$ErrorActionPreference = "Stop"

function Resolve-DefaultProjectDir {
    param([string]$RalphScriptRoot)
    $parent = Split-Path -Parent $RalphScriptRoot
    # Layout attuale: <repo>/.claude/ralph/*.ps1 → root repository = cartella sopra .claude
    if ((Split-Path -Leaf $parent) -eq '.claude') {
        return (Split-Path -Parent $parent)
    }
    # Layout legacy: <repo>/ralph/*.ps1 → root = padre della cartella ralph
    return $parent
}

# Determina la root del progetto (repository), non la cartella .claude
if ($ProjectDir -eq "") {
    $ProjectDir = Resolve-DefaultProjectDir -RalphScriptRoot $PSScriptRoot
}
$RalphDir = $PSScriptRoot

# Controlla stop.signal all'inizio — consumato e rimosso prima di fare qualsiasi cosa
$stopSignal = Join-Path $RalphDir "stop.signal"
if (Test-Path $stopSignal) {
    Remove-Item $stopSignal
    if ($Json) {
        '{"success":false,"prdComplete":false,"error":"stop.signal ricevuto"}' | Write-Output
    } else {
        Write-Host "🛑 Stop signal ricevuto — uscita senza eseguire l'iterazione." -ForegroundColor Yellow
    }
    exit 0
}

# ── Helper log (stderr in Json mode) ─────────────────────────────────────────
function Log([string]$msg, [string]$color = "White") {
    if ($Json) {
        [Console]::Error.WriteLine($msg)
    } else {
        Write-Host $msg -ForegroundColor $color
    }
}

Log "Ralph - Singola iterazione" "Cyan"
Log "Progetto: $ProjectDir" "Gray"
Log "Ralph dir: $RalphDir" "Gray"
Log "==========================================" "Cyan"

# ── Leggi prd.json ────────────────────────────────────────────────────────────
$prdPath = Join-Path $RalphDir "prd.json"
if (-not (Test-Path $prdPath)) {
    if ($Json) {
        '{"success":false,"prdComplete":false,"error":"prd.json non trovato"}' | Write-Output
    } else {
        Write-Host "ERRORE: prd.json non trovato in $prdPath" -ForegroundColor Red
    }
    exit 1
}

$prd = Get-Content $prdPath -Raw | ConvertFrom-Json
$buildCommand = $prd.buildCommand
$testCommand  = if ($prd.testCommand) { $prd.testCommand } else { "" }

# Snapshot storie prima di eseguire Claude (per rilevare quale storia viene completata)
$prdBefore = @{}
foreach ($s in $prd.userStories) {
    $prdBefore[$s.id] = [bool]$s.passes
}

# ── Costruisci riferimenti @libs dinamicamente ────────────────────────────────
$libsRef = ""
$localLibsPath = Join-Path $ProjectDir ".claude\libs"

if ($ClaudeLibsPath -ne "" -and (Test-Path $ClaudeLibsPath)) {
    # Usa path assoluto LIBRARIES — bypass symlink Windows
    if ($prd.libs -and $prd.libs.Count -gt 0) {
        $libLines = $prd.libs | ForEach-Object { "@$ClaudeLibsPath/$_" }
        $libsRef = $libLines -join "`n"
        Log "Libs caricate da LIBRARIES:" "Gray"
        $prd.libs | ForEach-Object { Log "  - $_" "DarkGray" }
    }
} elseif (Test-Path $localLibsPath) {
    # Fallback: .claude/libs locale
    if ($prd.libs -and $prd.libs.Count -gt 0) {
        $libLines = $prd.libs | ForEach-Object { "@.claude/libs/$_" }
        $libsRef = $libLines -join "`n"
        Log "Libs caricate da .claude/libs:" "Gray"
        $prd.libs | ForEach-Object { Log "  - $_" "DarkGray" }
    }
} else {
    Log "AVVISO: librerie non trovate. Verifica workspace.json o esegui init-project.sh." "Yellow"
}

# ── Includi memoria progetto se disponibile ───────────────────────────────────
$memoryRef = ""
$memoryPath = Join-Path $ProjectDir ".claude\memory\MEMORY.md"
if (Test-Path $memoryPath) {
    $memoryRef = "@.claude/memory/MEMORY.md"
    Log "Memoria progetto: caricata" "Gray"
} else {
    Log "Memoria progetto: non trovata (opzionale)" "DarkGray"
}

# ── Verifica bigplan.md ───────────────────────────────────────────────────────
$bigplanPath = Join-Path $RalphDir "bigplan.md"
$bigplanRef  = if (Test-Path $bigplanPath) { "@ralph/bigplan.md" } else { "" }

# ── Costruisci il prompt — ordine per Prompt Caching (US-CL-016) ─────────────
# Statico prima (più cacheable): CLAUDE.md, libs, memory
# Dinamico dopo (cambia ogni iterazione): bigplan, prd.json, progress.txt
$claudeMdRef = ""
$claudeMdPath = Join-Path $ProjectDir ".claude\CLAUDE.md"
if (-not (Test-Path $claudeMdPath)) { $claudeMdPath = Join-Path $ProjectDir "CLAUDE.md" }
if (Test-Path $claudeMdPath) { $claudeMdRef = "@CLAUDE.md" }

$contextRefs = @($claudeMdRef, $libsRef, $memoryRef, $bigplanRef, "@ralph/prd.json", "@ralph/progress.txt") |
    Where-Object { $_ -ne "" } |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -ne "" }
$contextBlock = $contextRefs -join "`n"

$testLine = if ($testCommand -ne "") { "   - Test: ``$testCommand``" } else { "" }

$prompt = @"
$contextBlock

## ISTRUZIONI PER QUESTA ITERAZIONE

1. Leggi @ralph/prd.json e individua la user story con priorità più alta (numero più basso) che ha "passes": false.
   Lavora ESCLUSIVAMENTE su quella storia — non iniziare la successiva.

2. Prima di scrivere codice, rileggi le convenzioni dei moduli caricati.
   Ogni file che crei DEVE rispettare naming, struttura e pattern definiti nelle libs.
   Se è disponibile memoria progetto, usa il contesto per capire le decisioni già prese.

3. Implementa la feature seguendo i pattern esistenti nel codebase.

4. Verifica che il progetto compili e i test passino:
   - Build: ``$buildCommand``
$testLine

5. Aggiorna ralph/prd.json:
   - Imposta "passes": true sulla storia appena completata
   - Aggiungi note sintetiche in "notes" (cosa hai fatto, eventuali decisioni)

5b. Aggiorna ralph/run-state.json con lo stato corrente (crea il file se mancante):
    - Durante il lavoro: {"status":"running","currentStoryId":"<id>","currentStoryTitle":"<titolo>","updatedAt":"<ISO>"}
    - Al termine con successo: {"status":"complete","currentStoryId":"<id>","prdComplete":<true|false>,"updatedAt":"<ISO>"}
    - In caso di errore: {"status":"error","error":"<descrizione>","updatedAt":"<ISO>"}
    Usa la data/ora attuale in formato ISO 8601 per updatedAt.

6. Aggiungi una riga a ralph/progress.txt nel formato:
   [US-XXX] Titolo storia — cosa è stato implementato (una riga)

7. Se esiste ralph/bigplan.md, segna il task corrispondente come [x].

8. Fai un git commit con il formato Conventional Commits:
   feat(scope): descrizione in italiano

## REGOLE CRITICHE

- Sessione non interattiva (Ralph): sei avviato con permessi tool già concessi (--dangerously-skip-permissions). Aggiorna senza indugi ralph/prd.json, ralph/run-state.json e ralph/progress.txt come ai punti 5–6 — non chiedere conferma all'utente né dire che servono permessi espliciti per questi file.
- Lavora su UNA SOLA user story per iterazione — mai più di una
- Rispetta SEMPRE le convenzioni dello stack caricato dai moduli libs
- NON saltare la verifica del build — se il build fallisce, correggilo prima del commit
- Se tutte le user stories hanno "passes": true, output esattamente: <promise>COMPLETE</promise>
"@

# ── Esegui Claude ─────────────────────────────────────────────────────────────
Log "`nAvvio Claude..." "Cyan"
if ($Json) {
    Log "Output con --verbose durante il run; la prima riga può comunque tardare (tool/API)." "DarkGray"
}

$success      = $true
$errorMessage = $null

Push-Location $ProjectDir
try {
    $savedNodeOptions = $env:NODE_OPTIONS
    $env:NODE_OPTIONS = ""
    if ($Json) {
        # --verbose: log intermedi su stderr; senza, molte sessioni -p restano muti fino alla fine
        claude -p $prompt --dangerously-skip-permissions --verbose 2>&1 | ForEach-Object {
            [Console]::Error.WriteLine($_)
        }
    } else {
        claude -p $prompt --dangerously-skip-permissions --verbose
    }
} catch {
    $success      = $false
    $errorMessage = $_.Exception.Message
    if (-not $Json) {
        Write-Host "ERRORE: $errorMessage" -ForegroundColor Red
    }
} finally {
    $env:NODE_OPTIONS = $savedNodeOptions
    Pop-Location
}

# ── Emit JSON se richiesto ────────────────────────────────────────────────────
if ($Json) {
    $completedStoryId    = $null
    $completedStoryTitle = $null
    $prdComplete         = $false

    if ($success -and (Test-Path $prdPath)) {
        try {
            $prdAfter = Get-Content $prdPath -Raw | ConvertFrom-Json
            foreach ($s in $prdAfter.userStories) {
                if ($prdBefore.ContainsKey($s.id) -and (-not $prdBefore[$s.id]) -and $s.passes) {
                    $completedStoryId    = $s.id
                    $completedStoryTitle = $s.title
                    break
                }
            }
            $prdComplete = -not ($prdAfter.userStories | Where-Object { -not $_.passes })
        } catch { }
    }

    $result = [ordered]@{ success = $success; prdComplete = $prdComplete }
    if ($completedStoryId)                    { $result['storyId'] = $completedStoryId; $result['storyTitle'] = $completedStoryTitle }
    if (-not $success -and $errorMessage)     { $result['error']   = $errorMessage }

    $result | ConvertTo-Json -Compress
}
