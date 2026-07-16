# Ralph - Loop autonomo di sviluppo
# Uso: .\ralph.ps1 -Iterations 10 [-Runner claude|cursor] [-ProjectDir "C:\path\al\progetto"] [-Json]
#
# -Json   Emette eventi NDJSON su stdout per iterazione; log umani su stderr.
#         Ogni riga stdout è un oggetto JSON (newline-delimited). Schema: docs/script-outputs.md
# Prerequisiti: vedi ralph-once.ps1

param(
    [Parameter(Mandatory = $true)]
    [int]$Iterations,

    [string]$ProjectDir = "",
    [string]$ClaudeLibsPath = "",
    [string]$Runner = "",
    [ValidateSet('ollama', 'claude', 'none', '')]
    [string]$PrePostRunner = '',
    [string]$CursorModel = "",
    [switch]$Json,
    [switch]$Step
)

$ErrorActionPreference = "Stop"

$runnerLib = Join-Path $PSScriptRoot 'lib\Invoke-RalphRunner.ps1'
if (-not (Test-Path $runnerLib)) {
    $libsPathFile = Join-Path $env:USERPROFILE '.claude_libs_path'
    $libsRoot = if ($ClaudeLibsPath -ne '' -and (Test-Path $ClaudeLibsPath)) {
        $ClaudeLibsPath
    } elseif ($env:CLAUDE_LIBS_PATH -and (Test-Path $env:CLAUDE_LIBS_PATH)) {
        $env:CLAUDE_LIBS_PATH
    } elseif (Test-Path $libsPathFile) {
        (Get-Content $libsPathFile -Raw).Trim()
    } else { $null }
    if ($libsRoot) {
        $runnerLib = Join-Path $libsRoot 'ralph\lib\Invoke-RalphRunner.ps1'
    }
}
if (-not (Test-Path $runnerLib)) {
    throw "Invoke-RalphRunner.ps1 non trovato. Esegui init-project o copia ralph/lib/ nel progetto."
}
. $runnerLib

function Resolve-DefaultProjectDir {
    param([string]$RalphScriptRoot)
    $parent = Split-Path -Parent $RalphScriptRoot
    if ((Split-Path -Leaf $parent) -eq '.claude') {
        return (Split-Path -Parent $parent)
    }
    return $parent
}

# Determina la root del progetto (repository), non la cartella .claude
if ($ProjectDir -eq "") {
    $ProjectDir = Resolve-DefaultProjectDir -RalphScriptRoot $PSScriptRoot
}
$RalphDir = $PSScriptRoot

# ── Selezione runner ─────────────────────────────────────────────────────────
if ($Runner -eq '') {
    if ($Json) {
        $Runner = if ($env:RALPH_RUNNER -in @('claude', 'cursor')) { $env:RALPH_RUNNER } else { 'claude' }
    } else {
        Write-Host ""
        Write-Host "Runner per questa sessione:" -ForegroundColor Cyan
        Write-Host "  [1] Claude Code (default)" -ForegroundColor Gray
        Write-Host "  [2] Cursor Agent" -ForegroundColor Gray
        $choice = Read-Host "Scelta [1]"
        if ($choice -eq '2') { $Runner = 'cursor' } else { $Runner = 'claude' }
    }
}

if ($Runner -notin @('claude', 'cursor')) {
    throw "Runner non valido: '$Runner'. Usa 'claude' o 'cursor'."
}

if ($Runner -eq 'cursor') {
    [void](Test-CursorRunnerPrereqs -ClaudeLibsPath $ClaudeLibsPath -ProjectDir $ProjectDir)
}

# ── Runner pre/post step (session brief + memoria) ───────────────────────────
# Default 'ollama': le fasi ausiliarie sono pura sintesi, il modello locale le copre
# a costo zero. 'claude' ripristina il comportamento storico; 'none' le salta.
if ($PrePostRunner -eq '') {
    $PrePostRunner = if ($env:RALPH_PREPOST_RUNNER -in @('ollama', 'claude', 'none')) {
        $env:RALPH_PREPOST_RUNNER
    } else { 'ollama' }
}

# ── Helper log (stderr in Json mode) ─────────────────────────────────────────
function Log([string]$msg, [string]$color = "White") {
    if ($Json) {
        [Console]::Error.WriteLine($msg)
    } else {
        Write-Host $msg -ForegroundColor $color
    }
}

Log "Ralph - Loop Autonomo" "Cyan"
Log "Progetto:   $ProjectDir" "Gray"
Log "Iterazioni: $Iterations" "Gray"
Log "Runner:     $Runner" "Gray"
Log "Pre/post:   $PrePostRunner" "Gray"
Log "==========================================" "Cyan"

# ── Helper: contesto minimale per pre/post step ───────────────────────────────
function Build-PrePostContextBlock {
    $parts = @()
    $mdPath = Join-Path $ProjectDir "CLAUDE.md"
    if (-not (Test-Path $mdPath)) { $mdPath = Join-Path $ProjectDir ".claude\CLAUDE.md" }
    if (Test-Path $mdPath) { $parts += "@CLAUDE.md" }
    $memPath = Join-Path $ProjectDir ".claude\memory\MEMORY.md"
    if (Test-Path $memPath) { $parts += "@.claude/memory/MEMORY.md" }
    $bpPath = Join-Path $RalphDir "bigplan.md"
    if (Test-Path $bpPath) { $parts += "@ralph/bigplan.md" }
    $pFile = Join-Path $RalphDir "prd.json"
    if (Test-Path $pFile) { $parts += "@ralph/prd.json" }
    $progFile = Join-Path $RalphDir "progress.txt"
    if (Test-Path $progFile) { $parts += "@ralph/progress.txt" }
    return ($parts -join "`n")
}

# ── Helper: contesto leggero per il post-step (senza bigplan.md) ─────────────
function Build-PostContextBlock {
    $parts = @()
    $mdPath = Join-Path $ProjectDir "CLAUDE.md"
    if (-not (Test-Path $mdPath)) { $mdPath = Join-Path $ProjectDir ".claude\CLAUDE.md" }
    if (Test-Path $mdPath) { $parts += "@CLAUDE.md" }
    $memPath = Join-Path $ProjectDir ".claude\memory\MEMORY.md"
    if (Test-Path $memPath) { $parts += "@.claude/memory/MEMORY.md" }
    $pFile = Join-Path $RalphDir "prd.json"
    if (Test-Path $pFile) { $parts += "@ralph/prd.json" }
    $progFile = Join-Path $RalphDir "progress.txt"
    if (Test-Path $progFile) { $parts += "@ralph/progress.txt" }
    return ($parts -join "`n")
}

# ── Helper: esegui post-step (aggiorna memoria dopo il loop) ─────────────────
function Invoke-PostStep {
    param([int]$CompletedIterations)

    # Riga riepilogativa su progress.txt: deterministica, la scrive lo script
    # (nessun modello — prima era un punto del prompt post-step).
    $progressFile = Join-Path $RalphDir "progress.txt"
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    try {
        Add-Content -Path $progressFile -Value "[POST-STEP] $stamp — $CompletedIterations iterazioni completate" -Encoding utf8
    } catch {
        Log "AVVISO: impossibile aggiornare progress.txt ($($_.Exception.Message))." "Yellow"
    }

    if ($PrePostRunner -eq 'none') {
        Log "`n[Post-step] Saltato (PrePostRunner=none) — solo riga progress." "DarkGray"
        return $true
    }

    Log "`n[Post-step] Aggiornamento memoria sessione ($PrePostRunner)..." "Cyan"

    if ($PrePostRunner -eq 'ollama') {
        # Riepilogo sessione via modello locale; lo scrive lo script in sprint.md.
        # decisions.md / tech-debt.md restano coperti dal contextSync per storia.
        if (-not (Get-Command Invoke-OllamaGenerate -ErrorAction SilentlyContinue)) {
            Log "AVVISO: lib Invoke-OllamaGenerate.ps1 mancante — post-step ridotto alla sola riga progress." "Yellow"
            return $false
        }
        $gitLog = ""
        if ($baseSha) {
            try { $gitLog = ((& git -C $ProjectDir log --oneline "$baseSha..HEAD" 2>$null) -join "`n") } catch { }
        }
        $postCtx = Build-OllamaContext -ContextBlock (Build-PostContextBlock) `
            -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath
        $postPrompt = @"
$postCtx

--- COMMIT DELLA SESSIONE ---
$gitLog
--- END ---

## POST-STEP: Riepilogo sessione Ralph

La sessione Ralph ha eseguito $CompletedIterations iterazioni. Scrivi in italiano un riepilogo
conciso (max 15 righe) della sessione per la memoria di progetto: storie completate, decisioni
tecniche rilevanti, problemi aperti. Rispondi SOLO con il riepilogo, senza preamboli e senza
code fence.
"@
        $summary = Invoke-OllamaGenerate -Prompt $postPrompt
        if ($summary) {
            $sprintPath = Join-Path $ProjectDir ".claude\memory\sprint.md"
            $sprintDir  = Split-Path -Parent $sprintPath
            try {
                if (-not (Test-Path $sprintDir)) { New-Item -ItemType Directory -Path $sprintDir -Force | Out-Null }
                Add-Content -Path $sprintPath -Value "`n## Sessione Ralph $stamp`n`n$summary" -Encoding utf8
                Log "[Post-step] Riepilogo sessione aggiunto a sprint.md (Ollama)." "Green"
                return $true
            } catch {
                Log "AVVISO: scrittura sprint.md fallita ($($_.Exception.Message))." "Yellow"
                return $false
            }
        }
        Log "AVVISO: Ollama non raggiungibile (OLLAMA_URL/OLLAMA_MODEL) — post-step ridotto alla sola riga progress." "Yellow"
        return $false
    }

    # PrePostRunner=claude: comportamento storico (run agente completo).
    $postCtx = Build-PostContextBlock
    $postPrompt = @"
$postCtx

## POST-STEP: Aggiornamento memoria sessione

La sessione Ralph ha eseguito $CompletedIterations iterazioni. Esegui in modalità non interattiva senza chiedere conferme:
1. Aggiorna .claude/memory/sprint.md con le storie completate in questa sessione.
2. Aggiungi in .claude/memory/decisions.md le decisioni architetturali emerse.
3. Registra in .claude/memory/tech-debt.md eventuali debiti tecnici identificati.

La riga [POST-STEP] in ralph/progress.txt è già stata scritta: non aggiungerla di nuovo.
Modifica solo i file che hanno effettivamente nuove informazioni da registrare.
"@
    $ok = $false
    try {
        Invoke-RalphRunner -Prompt $postPrompt -ProjectDir $ProjectDir -Runner $Runner `
            -ClaudeLibsPath $ClaudeLibsPath -CursorModel $CursorModel -RalphVerbose `
            -EmitResultToStdout:(-not $Json.IsPresent)
        $ok = $true
    } catch {
        Log "AVVISO: post-step fallito ($($_.Exception.Message))." "Yellow"
    }
    return $ok
}

$ralphOncePath = Join-Path $RalphDir "ralph-once.ps1"

# ── Pre-step: genera ralph/session-brief.txt ─────────────────────────────────
$sessionBriefPath = Join-Path $RalphDir "session-brief.txt"
$preStepSuccess = $false
$prdPath = Join-Path $RalphDir "prd.json"

$preStepInstructions = @"
## PRE-STEP: Genera Session Brief

Leggi il PRD e lo stato del progetto. Genera un briefing conciso in italiano con:
1. Stato PRD: storie completate / totali
2. Prossima storia da implementare (id, titolo, acceptance criteria chiave)
3. Dipendenze e rischi rilevanti per le storie rimanenti
4. Contesto tecnico dalla memoria utile per questa sessione

Scrivi SOLO il briefing (max 25 righe), senza preamboli e senza code fence.
"@

if (-not (Test-Path $prdPath)) {
    Log "AVVISO: prd.json non trovato — pre-step saltato." "Yellow"
} elseif ($PrePostRunner -eq 'none') {
    Log "[Pre-step] Saltato (PrePostRunner=none)." "DarkGray"
} elseif ($PrePostRunner -eq 'ollama') {
    Log "`n[Pre-step] Generazione session brief (Ollama)..." "Cyan"
    $briefText = $null
    if (Get-Command Invoke-OllamaGenerate -ErrorAction SilentlyContinue) {
        $preCtx = Build-OllamaContext -ContextBlock (Build-PrePostContextBlock) `
            -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath
        $briefText = Invoke-OllamaGenerate -Prompt "$preCtx`n$preStepInstructions"
    } else {
        Log "AVVISO: lib Invoke-OllamaGenerate.ps1 mancante — riesegui init/reconcile per sincronizzare ralph/lib/." "Yellow"
    }
    if ($briefText) {
        $briefText | Set-Content -Path $sessionBriefPath -Encoding utf8
        $preStepSuccess = $true
        Log "[Pre-step] Session brief salvato (Ollama): $sessionBriefPath" "Green"
    } else {
        # Niente fallback Claude implicito: il brief è opzionale e il fallback
        # re-introdurrebbe il costo che PrePostRunner=ollama vuole eliminare.
        Log "AVVISO: Ollama non raggiungibile (OLLAMA_URL/OLLAMA_MODEL) — brief saltato, continuo senza." "Yellow"
    }
} else {
    Log "`n[Pre-step] Generazione session brief..." "Cyan"
    $preCtx = Build-PrePostContextBlock
    $prePrompt = @"
$preCtx

$preStepInstructions
"@
    try {
        $briefText = Invoke-RalphRunner -Prompt $prePrompt -ProjectDir $ProjectDir -Runner $Runner `
            -ClaudeLibsPath $ClaudeLibsPath -CursorModel $CursorModel -CaptureOutput -RalphVerbose
        if ($briefText) {
            $briefText | Set-Content -Path $sessionBriefPath -Encoding utf8
            $preStepSuccess = $true
            Log "[Pre-step] Session brief salvato: $sessionBriefPath" "Green"
        }
    } catch {
        Log "AVVISO: pre-step fallito ($($_.Exception.Message)) — continuo senza session brief." "Yellow"
    }
}

if ($Json) {
    [ordered]@{ event = "pre_step"; success = $preStepSuccess; runner = $Runner; prePostRunner = $PrePostRunner } |
        ConvertTo-Json -Compress | Write-Output
}

# ── Completamento autoritativo e guardia anti-stallo ─────────────────────────
# La verità sul completamento è lo stato di ralph/prd.json (userStories[].passes),
# NON un tag di stringa nell'output del runner: un literal "<promise>COMPLETE</promise>"
# può comparire in un commento o in un criterio di accettazione e causare un falso
# completamento. Il tag resta un segnale secondario.
function Get-PrdStories {
    $pFile = Join-Path $RalphDir "prd.json"
    if (-not (Test-Path $pFile)) { return $null }
    try { return @((Get-Content $pFile -Raw | ConvertFrom-Json).userStories) } catch { return $null }
}
function Get-PrdPassCount {
    $s = Get-PrdStories
    if ($null -eq $s) { return 0 }
    return @($s | Where-Object { $_.passes }).Count
}
function Test-PrdComplete {
    $s = Get-PrdStories
    if ($null -eq $s -or @($s).Count -eq 0) { return $false }
    return -not (@($s) | Where-Object { -not $_.passes })
}

# Crash-stop: se il PRD non avanza (nessuna storia passa a "passes":true) per
# $maxStall iterazioni consecutive, il loop è probabilmente bloccato (build/test
# rosso o storia troppo grande). Allinea il codice al pilastro H di RALPH+.
# $baseSha nullo se la cartella non è un repo git (o repo senza commit): il loop
# prosegue, semplicemente senza SHA di recupero né git log nel post-step.
# NB: con $ErrorActionPreference=Stop il redirect 2>$null su comando nativo rende
# terminante lo stderr di git in PS 5.1 — serve il try/catch.
$baseSha = $null
try {
    $baseSha = (& git -C $ProjectDir rev-parse HEAD 2>$null)
    if ($LASTEXITCODE -ne 0) { $baseSha = $null }
} catch { $baseSha = $null }
$prevPassCount = Get-PrdPassCount
$stallCount    = 0
# Soglia di stallo configurabile (default 2 = regola dei due tentativi di RALPH+).
$maxStall      = if ($env:RALPH_MAX_STALL -match '^\d+$') { [int]$env:RALPH_MAX_STALL } else { 2 }

# Emette il sommario di recupero e termina con exit code dedicato (3 = crash-stop).
function Stop-RalphStalled {
    param([int]$Iteration, [int]$PassCount)
    if ($Json) {
        [ordered]@{ event = "crash_stop"; iteration = $Iteration; reason = "no_progress";
                    passCount = $PassCount; baseSha = $baseSha; runner = $Runner } |
            ConvertTo-Json -Compress | Write-Output
    } else {
        Write-Host "`n🛑 CRASH-STOP: nessun avanzamento del PRD per $maxStall iterazioni consecutive." -ForegroundColor Red
        Write-Host "   Storie completate: $PassCount. Probabile blocco (build/test rosso o storia troppo grande)." -ForegroundColor Yellow
        if ($baseSha) {
            Write-Host "   Commit di partenza: $baseSha" -ForegroundColor Gray
            Write-Host "   Recupero in sicurezza: usa /rewind, oppure rivedi e (se serve) 'git reset --soft $baseSha'." -ForegroundColor Gray
        }
    }
    exit 3
}

for ($i = 1; $i -le $Iterations; $i++) {
    # Controlla stop.signal all'inizio di ogni iterazione — consumato e rimosso
    $stopSignal = Join-Path $RalphDir "stop.signal"
    if (Test-Path $stopSignal) {
        Remove-Item $stopSignal
        if ($Json) {
            [ordered]@{ event = "stopped"; iteration = $i; reason = "stop.signal"; runner = $Runner } |
                ConvertTo-Json -Compress | Write-Output
        } else {
            Write-Host "`n🛑 Stop signal ricevuto — fermato prima dell'iterazione $i." -ForegroundColor Yellow
            Write-Host "   Iterazioni completate: $($i - 1) di $Iterations" -ForegroundColor Gray
        }
        exit 0
    }

    Log "`nIterazione $i di $Iterations" "Yellow"
    Log "--------------------------------" "Yellow"

    $onceArgs = @{
        ProjectDir     = $ProjectDir
        ClaudeLibsPath = $ClaudeLibsPath
        Runner         = $Runner
        CursorModel    = $CursorModel
    }

    if ($Json) {
        if ($Step) { $onceArgs['Step'] = $true; $onceArgs['Json'] = $true }
        else { $onceArgs['Json'] = $true }
        $iterJson = & $ralphOncePath @onceArgs

        try {
            $iterResult = $iterJson | ConvertFrom-Json
            [ordered]@{
                event         = "iteration"
                iteration     = $i
                maxIterations = $Iterations
                runner        = $Runner
                result        = $iterResult
            } | ConvertTo-Json -Compress -Depth 10 | Write-Output

            if ($iterResult.prdComplete) {
                $postOk = Invoke-PostStep -CompletedIterations $i
                [ordered]@{ event = "post_step"; success = $postOk; iterations = $i; runner = $Runner; prePostRunner = $PrePostRunner } |
                    ConvertTo-Json -Compress | Write-Output
                [ordered]@{ event = "complete"; iterations = $i; runner = $Runner } |
                    ConvertTo-Json -Compress | Write-Output
                exit 0
            }
        } catch {
            [ordered]@{
                event         = "iteration"
                iteration     = $i
                maxIterations = $Iterations
                runner        = $Runner
                result        = @{ success = $false; prdComplete = $false; error = "output non parsabile" }
            } | ConvertTo-Json -Compress -Depth 10 | Write-Output
        }
    } else {
        if ($Step) { $onceArgs['Step'] = $true }
        $result = & $ralphOncePath @onceArgs 2>&1 | Out-String
        Write-Host $result

        $prdDone       = Test-PrdComplete
        $promiseSignal = $result -match "<promise>COMPLETE</promise>"
        if ($promiseSignal -and -not $prdDone) {
            Write-Host "`n⚠️  <promise>COMPLETE</promise> rilevato ma ralph/prd.json ha ancora storie pending — proseguo (niente falso completamento)." -ForegroundColor Yellow
        }

        if ($prdDone) {
            Write-Host "`n✅ PRD COMPLETATO dopo $i iterazioni!" -ForegroundColor Green
            Invoke-PostStep -CompletedIterations $i

            try {
                [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
                [System.Windows.Forms.MessageBox]::Show(
                    "Ralph ha completato il PRD dopo $i iterazioni!",
                    "Ralph - Completato", 'OK', 'Information'
                ) | Out-Null
            } catch { }

            exit 0
        }
    }

    # ── Guardia anti-stallo (vale per entrambi i runner) ─────────────────────
    $newPassCount = Get-PrdPassCount
    if ($newPassCount -gt $prevPassCount) { $stallCount = 0 } else { $stallCount++ }
    $prevPassCount = $newPassCount
    # $maxStall < 1 disabilita la guardia (RALPH_MAX_STALL=0).
    if ($maxStall -ge 1 -and $stallCount -ge $maxStall) { Stop-RalphStalled -Iteration $i -PassCount $newPassCount }
}

if ($Json) {
    $postOk = Invoke-PostStep -CompletedIterations $Iterations
    [ordered]@{ event = "post_step"; success = $postOk; iterations = $Iterations; runner = $Runner; prePostRunner = $PrePostRunner } |
        ConvertTo-Json -Compress | Write-Output
    [ordered]@{ event = "loop_end"; iterations = $Iterations; completed = $false; runner = $Runner } |
        ConvertTo-Json -Compress | Write-Output
} else {
    Invoke-PostStep -CompletedIterations $Iterations
    Write-Host "`n⚠️  Completate $Iterations iterazioni. Il PRD potrebbe non essere ancora finito." -ForegroundColor Yellow
    Write-Host "   Controlla ralph/prd.json per lo stato delle storie e riavvia se necessario." -ForegroundColor Gray
}
