# Ralph - Singola iterazione autonoma
# Uso: .\ralph-once.ps1 [-ProjectDir "C:\path\al\progetto"] [-Runner claude|cursor] [-Json]
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
    [string]$Mode = "",
    [ValidateSet('claude', 'cursor')]
    [string]$Runner = 'claude',
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
Log "Runner: $Runner" "Gray"
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
$reviewGate   = [bool]$prd.reviewGate
$pullRequest  = [bool]$prd.pullRequest

# Skill frontend-design (plugin Claude Code): attiva solo su stack UI/web e runner Claude
# (Cursor non ha i plugin). Riferimento difensivo: "se disponibile" — no-op se non installata.
$frontendStacks = @('nextjs', 'angular', 'react-native', 'electron')
$isFrontendUi   = ($Runner -eq 'claude') -and ($frontendStacks -contains ([string]$prd.stack).ToLower())

# Team di ruoli (agentTeam): default a livello PRD + ruoli della pipeline.
$agentTeam    = [bool]$prd.agentTeam
$defaultRoles = @('planner', 'implementer', 'tester', 'reviewer')
$teamRoles    = if ($prd.teamRoles) { @($prd.teamRoles) } else { $defaultRoles }

# Risolvi la prossima storia (priorità più bassa con passes:false) per applicare gli
# override per-storia di agentTeam/teamRoles. Claude sceglierà la stessa storia.
$nextStory = $prd.userStories |
    Where-Object { -not $_.passes } |
    Sort-Object { [int]$_.priority } |
    Select-Object -First 1
if ($nextStory) {
    if ($null -ne $nextStory.agentTeam) { $agentTeam = [bool]$nextStory.agentTeam }
    if ($nextStory.teamRoles)           { $teamRoles = @($nextStory.teamRoles) }
}

# Snapshot storie prima di eseguire Claude (per rilevare quale storia viene completata)
$prdBefore = @{}
foreach ($s in $prd.userStories) {
    $prdBefore[$s.id] = [bool]$s.passes
}

# Genera prd-prompt.json: SOLO la storia corrente ($nextStory) è inclusa intatta;
# tutte le altre (completate e pending non correnti) sono ridotte a stub. Output
# compatto (-Compress). Taglia i token dinamici per iterazione: il modello lavora
# su una storia sola, le altre servono solo come roadmap (id/title/priority/passes).
$nextStoryId = if ($nextStory) { $nextStory.id } else { $null }
$prdPromptObj = [ordered]@{
    project      = $prd.project
    branchName   = $prd.branchName
    description  = $prd.description
    stack        = $prd.stack
    buildCommand = $prd.buildCommand
    testCommand  = if ($prd.testCommand) { $prd.testCommand } else { $null }
    userStories  = @($prd.userStories | ForEach-Object {
        if ($_.passes) {
            [ordered]@{ id = $_.id; title = $_.title; passes = $true }
        } elseif ($null -ne $nextStoryId -and $_.id -eq $nextStoryId) {
            $_  # storia corrente: dettaglio completo (acceptanceCriteria, dependsOn…)
        } else {
            [ordered]@{ id = $_.id; title = $_.title; priority = $_.priority; passes = $false }
        }
    })
}
$prdPromptPath = Join-Path $RalphDir "prd-prompt.json"
$prdPromptObj | ConvertTo-Json -Depth 10 -Compress | Set-Content $prdPromptPath -Encoding utf8

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

# ── Context sync (contextSync, default true) ─────────────────────────────────
# Dopo il commit di ogni storia Ralph esegue workflows/story-context-sync.md (best-effort,
# via ollama-sidecar MCP se disponibile). Vedi ralph/prd.schema.json (contextSync).
$contextSync = if ($null -ne $prd.contextSync) { [bool]$prd.contextSync } else { $true }
$contextSyncRef = ""
if ($contextSync) {
    $syncRel = "workflows/story-context-sync.md"
    if ($ClaudeLibsPath -ne "" -and (Test-Path (Join-Path $ClaudeLibsPath "workflows\story-context-sync.md"))) {
        $contextSyncRef = "@$ClaudeLibsPath/$syncRel"
    } elseif (Test-Path (Join-Path $localLibsPath "workflows\story-context-sync.md")) {
        $contextSyncRef = "@.claude/libs/$syncRel"
    }
    if ($contextSyncRef -eq "") {
        $contextSync = $false
        Log "AVVISO: contextSync attivo ma $syncRel non trovato nelle libs — sync saltato" "Yellow"
    } elseif ($prd.libs -and (@($prd.libs) -contains $syncRel)) {
        # Workflow già incluso via prd.libs ($libsRef): evita il doppio @ref nel contesto
        $contextSyncRef = ""
    }
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

# ── Mode override ────────────────────────────────────────────────────────────
$modeRef = ""
if ($Mode -ne "") {
    # Cerca la directory modes/ nella claude-libs
    $modesDir = $null
    if ($ClaudeLibsPath -ne "" -and (Test-Path "$ClaudeLibsPath\modes")) {
        $modesDir = "$ClaudeLibsPath\modes"
    } elseif (Test-Path (Join-Path $localLibsPath "..\modes")) {
        try { $modesDir = (Resolve-Path (Join-Path $localLibsPath "..\modes")).Path } catch { }
    }

    if ($modesDir -and (Test-Path "$modesDir\$Mode.md")) {
        $modeContent = Get-Content "$modesDir\$Mode.md" -Raw -Encoding utf8
        $now         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        $modeHeader  = "<!-- mode-override.md — ralph-once.ps1 -Mode $Mode | $now -->`n`n"
        $claudeDir   = Join-Path $ProjectDir ".claude"
        if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Path $claudeDir | Out-Null }
        Set-Content -Path (Join-Path $claudeDir "mode-override.md") `
                    -Value ($modeHeader + $modeContent) -Encoding utf8 -NoNewline
        [ordered]@{ mode = $Mode; activatedAt = $now; extras = @(); modeFile = "modes/$Mode.md" } |
            ConvertTo-Json | Set-Content -Path (Join-Path $claudeDir "active-mode.json") -Encoding utf8
        $modeRef = "@.claude/mode-override.md"
        Log "Mode attivo: $Mode" "Cyan"
    } else {
        Log "AVVISO: mode '$Mode' non trovato in $modesDir — iterazione continua senza mode." "Yellow"
    }
}

# ── Includi command file fasi iterazione ─────────────────────────────────────
$defaultIterationCommands = @("review", "style-check", "security-check", "test", "changelog", "remember")
$iterationCommandNames = if ($prd.iterationCommands -and $prd.iterationCommands.Count -gt 0) {
    $prd.iterationCommands
} else {
    $defaultIterationCommands
}

# Mapping nome iterazione → skill first-party di Claude Code (fallback quando manca il custom file).
# Un nome risolve PRIMA al custom file .claude/commands/<nome>.md (override per-progetto, cacheable);
# se assente ma presente qui, il prompt istruisce la skill built-in equivalente (via Skill tool).
$builtinSkillMap = @{
    'review'         = @{ skill = 'code-review';     nudge = 'usa la skill ``/code-review`` (Skill tool) sulla diff della storia per individuare bug e opportunità di cleanup' }
    'security-check' = @{ skill = 'security-review'; nudge = 'usa la skill ``/security-review`` (Skill tool) sulle modifiche pendenti del branch' }
    'test'           = @{ skill = 'verify';          nudge = "usa la skill ``/verify`` (Skill tool) per confermare che la storia funzioni davvero eseguendo l'app" }
}

$commandRefs = @()
$skillNudges = @()
$commandsDir = Join-Path $ProjectDir ".claude\commands"
foreach ($cmdName in $iterationCommandNames) {
    $cmdFile = Join-Path $commandsDir "$cmdName.md"
    if (Test-Path $cmdFile) {
        $commandRefs += "@.claude/commands/$cmdName.md"
    } elseif ($builtinSkillMap.ContainsKey($cmdName)) {
        $skillNudges += $builtinSkillMap[$cmdName].nudge
        Log "Comando '$cmdName' → skill built-in /$($builtinSkillMap[$cmdName].skill) (nessun custom file)" "Gray"
    } else {
        Log "AVVISO: command file non trovato: .claude/commands/$cmdName.md — saltato" "Yellow"
    }
}
$commandsRef = if ($commandRefs.Count -gt 0) { $commandRefs -join "`n" } else { "" }
if ($commandRefs.Count -gt 0) {
    Log "Command file iterazione (custom): $($commandRefs.Count)/$($iterationCommandNames.Count)" "Gray"
}
if ($skillNudges.Count -gt 0) {
    Log "Skill Claude Code attive: $($skillNudges.Count) (fallback built-in)" "Gray"
}
if ($commandRefs.Count -eq 0 -and $skillNudges.Count -eq 0) {
    Log "AVVISO: nessun command file né skill built-in risolti dalle iterationCommands" "Yellow"
}

# ── Verifica bigplan.md ───────────────────────────────────────────────────────
$bigplanPath = Join-Path $RalphDir "bigplan.md"
$bigplanRef  = if (Test-Path $bigplanPath) { "@ralph/bigplan.md" } else { "" }

# ── Includi session brief se disponibile ─────────────────────────────────────
$sessionBriefRef = ""
$sessionBriefFile = Join-Path $RalphDir "session-brief.txt"
if (Test-Path $sessionBriefFile) {
    $sessionBriefRef = "@ralph/session-brief.txt"
    Log "Session brief: trovato e incluso" "Gray"
} else {
    Log "Session brief: non trovato (opzionale)" "DarkGray"
}

# ── Costruisci il prompt — ordine per Prompt Caching (US-CL-016) ─────────────
# Statico prima (più cacheable): CLAUDE.md, libs, memory, command files
# Dinamico dopo (cambia ogni iterazione): bigplan, session-brief, prd.json, progress.txt
$claudeMdRef = ""
$claudeMdPath = Join-Path $ProjectDir ".claude\CLAUDE.md"
if (-not (Test-Path $claudeMdPath)) { $claudeMdPath = Join-Path $ProjectDir "CLAUDE.md" }
if (Test-Path $claudeMdPath) { $claudeMdRef = "@CLAUDE.md" }

$contextRefs = @($claudeMdRef, $libsRef, $contextSyncRef, $memoryRef, $modeRef, $commandsRef, $bigplanRef, $sessionBriefRef, "@ralph/prd-prompt.json", "@ralph/progress.txt") |
    Where-Object { $_ -ne "" } |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -ne "" }
$contextBlock = $contextRefs -join "`n"

$testLine = if ($testCommand -ne "") { "   - Test: ``$testCommand``" } else { "" }

# Review gate (US-CL — reviewGate): quando attivo, la storia è completabile solo dopo
# un /code-review (+ /security-review) senza rilievi bloccanti. Vedi ralph/skills/review-gate.md.
$reviewGateBlock = if ($reviewGate) {
    Log "Review gate: ATTIVO (storia completata solo se /code-review è pulito)" "Cyan"
@"

4b. REVIEW GATE (obbligatorio — reviewGate attivo): prima di marcare la storia completata, revisiona
    la diff di questa storia. Usa le linee guida di @.claude/commands/review.md e
    @.claude/commands/security-check.md se presenti nel contesto; altrimenti esegui le skill
    first-party ``/code-review`` e ``/security-review`` (Skill tool). Puoi impostare "passes": true
    SOLO se non restano rilievi bloccanti (❌). Se ne emergono, correggili in QUESTA stessa iterazione,
    ri-verifica build/test, e solo allora completa la storia. Non passare alla storia successiva con
    un review non pulito.
"@
} else { "" }

# ── Team di ruoli (agentTeam) ─────────────────────────────────────────────────
# Quando attivo, l'iterazione delega la storia a una pipeline di subagent via Task tool
# (planner → implementer → tester → reviewer). Il reviewer assorbe il review-gate.
# Vedi ralph/skills/agent-team.md.
function Sync-RoleAgents([string]$SrcDir, [string]$DestDir) {
    if (-not (Test-Path $SrcDir)) { return 0 }
    if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }
    $n = 0
    foreach ($f in (Get-ChildItem -Path $SrcDir -Filter '*.md' -File)) {
        $dest = Join-Path $DestDir $f.Name
        $needs = $true
        if (Test-Path $dest) {
            $needs = (Get-Content $f.FullName -Raw) -ne (Get-Content $dest -Raw)
        }
        if ($needs) { Copy-Item $f.FullName $dest -Force; $n++ }
    }
    return $n
}
function Add-GitignoreEntry([string]$Root, [string]$Entry) {
    $gi = Join-Path $Root ".gitignore"
    if (Test-Path $gi) {
        if ((Get-Content $gi) -contains $Entry) { return }
        Add-Content -Path $gi -Value $Entry -Encoding utf8
    } else {
        Set-Content -Path $gi -Value $Entry -Encoding utf8
    }
}

$agentTeamBlock = ""
if ($agentTeam) {
    Log "Agent team: ATTIVO (ruoli: $($teamRoles -join ' → '))" "Cyan"

    # Provisioning runtime: copia le definizioni dei ruoli in .claude/agents/ del progetto
    # (idempotente, diff-based) e assicura .claude/team/ in .gitignore. Robusto anche nei
    # worktree di ralph-parallel: la sorgente è il clone canonico (cartella di questo script).
    $synced = Sync-RoleAgents -SrcDir (Join-Path $RalphDir "agents") -DestDir (Join-Path $ProjectDir ".claude\agents")
    if ($synced -gt 0) { Log "Agent team: $synced definizione/i ruolo aggiornate in .claude/agents/" "Gray" }
    Add-GitignoreEntry -Root $ProjectDir -Entry ".claude/team/"

    # Il reviewer (ruolo) assorbe il review-gate: evita di iniettare anche il blocco 4b.
    $reviewGateBlock = ""

    $testParen = if ($testCommand -ne "") { " e test (``$testCommand``)" } else { "" }
    $fdSuffix  = if ($isFrontendUi) { " Per le parti UI usa la skill ``frontend-design`` (Skill tool) se disponibile." } else { "" }
    $roleStepMap = [ordered]@{
        planner     = "ralph-planner → analizza SOLO la storia selezionata e scrivi .claude/team/plan.md (piano d'implementazione)."
        implementer = "ralph-implementer → implementa .claude/team/plan.md rispettando le convenzioni libs; aggiorna .claude/team/impl-notes.md.$fdSuffix"
        tester      = "ralph-tester → garantisci build (``$buildCommand``)$testParen verdi; correggi i fallimenti fino a exit 0."
        reviewer    = "ralph-reviewer → revisiona la diff della storia, scrivi .claude/team/review-notes.md, verdetto PULITO/BLOCCATO."
    }
    $letters = @('a', 'b', 'c', 'd', 'e', 'f')
    $i = 0
    $roleLines = foreach ($r in $teamRoles) {
        if ($roleStepMap.Contains($r)) {
            "   $($letters[$i]). via Task tool (subagent_type: ralph-$r): $($roleStepMap[$r])"
            $i++
        }
    }
    $roleLinesText = ($roleLines -join "`n")

    $agentTeamBlock = @"
2-4. TEAM DI RUOLI (agentTeam attivo per questa storia): NON implementare in prima persona.
   Agisci da ORCHESTRATORE e delega la storia selezionata (step 1) a una pipeline di subagent
   tramite il Task tool, nell'ordine indicato. Crea la cartella .claude/team/ se manca (handoff).

$roleLinesText

   LOOP DI GATE: se ralph-reviewer riporta rilievi bloccanti ❌ (verdetto BLOCCATO), ri-delega a
   ralph-implementer (poi ralph-tester) per correggerli e ri-esegui ralph-reviewer. Completa la
   storia (step 5) SOLO quando il reviewer è PULITO e build/test sono verdi. Non passare alla
   storia successiva con un review non pulito.
   Tu orchestratore NON scrivi codice né esegui build/test in prima persona: lo fanno i subagent.
   Restano comunque TUOI gli step 5-9 e successivi (prd.json, run-state, progress, commit,
   eventuali PR e context sync).
"@
}

# Nudge skill frontend-design nel flusso monolitico (solo stack UI + runner Claude).
$frontendDesignBlock = if ($isFrontendUi) {
    Log "Skill frontend-design: nudge attivo (stack UI)" "Gray"
@"

   Per le parti di UI/frontend usa la skill ``frontend-design`` (Skill tool), se disponibile,
   per generare interfacce curate e distintive (evita l'estetica generica). Resta coerente
   con i design token e i componenti già presenti nel progetto.
"@
} else { "" }

# Blocco comandi Claude Code: skill first-party risolte come fallback dalle iterationCommands
# (vedi $builtinSkillMap). Vuoto se ogni nome ha un custom file o non è mappato.
$claudeCommandsBlock = if ($skillNudges.Count -gt 0) {
    $nudgeLines = ($skillNudges | ForEach-Object { "- $_" }) -join "`n"
@"

## COMANDI CLAUDE CODE (skill first-party)

Durante questa iterazione, prima di marcare la storia completata, esegui le seguenti skill di Claude
Code sulla diff/stato della storia corrente (sessione non interattiva: invocale via Skill tool senza
chiedere conferma) e correggi i rilievi bloccanti nella STESSA iterazione:
$nudgeLines
"@
} else { "" }

# Blocco implementazione: pipeline di ruoli (agentTeam) oppure flusso monolitico standard.
$implementBlock = if ($agentTeam) {
    $agentTeamBlock
} else {
@"
2. Prima di scrivere codice, rileggi le convenzioni dei moduli caricati.
   Ogni file che crei DEVE rispettare naming, struttura e pattern definiti nelle libs.
   Se è disponibile memoria progetto, usa il contesto per capire le decisioni già prese.

3. Implementa la feature seguendo i pattern esistenti nel codebase.
$frontendDesignBlock
4. Verifica che il progetto compili e i test passino:
   - Build: ``$buildCommand``
$testLine
$reviewGateBlock
"@
}

# Pull request (US-CL — pullRequest): quando attivo, dopo il commit della storia Ralph
# pusha il branch e apre/mantiene una PR draft. Vedi ralph/skills/pull-request.md.
$pullRequestBlock = if ($pullRequest) {
    Log "Pull request: ATTIVA (push + PR draft ad ogni storia)" "Cyan"
@"

9b. PULL REQUEST (pullRequest attivo): dopo il commit, pusha il branch corrente
    (git push -u origin HEAD). Se per il branch non esiste già una PR aperta, creane una
    DRAFT con gh: gh pr create --draft --fill --base <branch di default> (best-effort).
    Se gh non è disponibile o non autenticato, salta senza errori: il push basta.
    Non creare una PR nuova se ne esiste già una per il branch — le push successive la aggiornano.
"@
} else { "" }

# Context sync (US-CL — contextSync): dopo il commit, sync best-effort della memoria di
# contesto secondo workflows/story-context-sync.md. Vedi ralph/README.md.
$contextSyncBlock = if ($contextSync) {
    Log "Context sync: ATTIVO (story-context-sync.md dopo il commit)" "Cyan"
@"

9c. CONTEXT SYNC (contextSync attivo): dopo il commit della storia esegui il workflow
    story-context-sync.md (caricato nel contesto): analizza la diff della storia con il tool
    mcp__ollama-sidecar__analyze_story_completion e applica gli aggiornamenti descritti
    (convenzioni in CLAUDE.md, decisioni in .claude/memory/decisions.md, sprint.md).
    Best-effort: se il tool MCP/Ollama non è disponibile aggiorna solo
    .claude/memory/sprint.md e logga in ralph/progress.txt:
    [context-sync] Ollama non disponibile — solo sprint.md aggiornato
    Non bloccare MAI l'iterazione per errori del sync: logga e prosegui.
"@
} else { "" }

$prompt = @"
$contextBlock

## POLICY NON INTERATTIVA

Esegui in modalità non interattiva: nessuna domanda, nessuna richiesta di conferma, applica fallback predefiniti. Le fasi di iterazione sono coperte dai command file custom presenti nel contesto (`@.claude/commands/...`) e, dove assenti, dalle skill first-party di Claude Code indicate sotto — applica le loro linee guida automaticamente durante il lavoro.
$claudeCommandsBlock

## ISTRUZIONI PER QUESTA ITERAZIONE

1. Leggi @ralph/prd-prompt.json per il contesto storie (versione ottimizzata per token):
   SOLO la storia corrente è inclusa con dettaglio completo (acceptanceCriteria, dependsOn);
   tutte le altre sono stub {id,title,priority,passes} come semplice roadmap. La storia da
   implementare è quella con "passes": false e dettaglio completo (priorità più alta = numero
   più basso). Lavora ESCLUSIVAMENTE su quella storia — non iniziare la successiva.

$implementBlock
5. Aggiorna ralph/prd.json (file autoritativo — NON prd-prompt.json):
   - Imposta "passes": true sulla storia appena completata
   - Aggiungi note sintetiche in "notes" (cosa hai fatto, eventuali decisioni)

6b. Aggiorna ralph/run-state.json con lo stato corrente (crea il file se mancante):
    - Durante il lavoro: {"status":"running","currentStoryId":"<id>","currentStoryTitle":"<titolo>","mode":"$Mode","updatedAt":"<ISO>"}
    - Al termine con successo: {"status":"complete","currentStoryId":"<id>","prdComplete":<true|false>,"mode":"$Mode","updatedAt":"<ISO>"}
    - In caso di errore: {"status":"error","error":"<descrizione>","mode":"$Mode","updatedAt":"<ISO>"}
    Usa la data/ora attuale in formato ISO 8601 per updatedAt.

7. Aggiungi una riga a ralph/progress.txt nel formato:
   [US-XXX] Titolo storia — cosa è stato implementato (una riga)

8. Se esiste ralph/bigplan.md, segna il task corrispondente come [x].

9. Fai un git commit con il formato Conventional Commits:
   feat(scope): descrizione in italiano
$pullRequestBlock$contextSyncBlock
## REGOLE CRITICHE

- POLICY NON-INTERATTIVA: Esegui in modalità non interattiva, nessuna domanda, applica fallback predefiniti deterministici (se un comando chiede chiarimenti, procedi col miglior default sensato).
- Sessione non interattiva (Ralph): sei avviato con permessi tool già concessi (--dangerously-skip-permissions). Aggiorna senza indugi ralph/prd.json, ralph/run-state.json e ralph/progress.txt come ai punti 6–7 — non chiedere conferma all'utente né dire che servono permessi espliciti per questi file.
- SCRITTURA FILE: per creare o modificare QUALSIASI file (codice sorgente, prd.json, run-state.json, progress.txt) usa SEMPRE i tool Write/Edit, MAI heredoc Bash (`cat <<EOF`) né New-Item/Set-Content PowerShell. I caratteri `{ }` nel codice (C#, JSON, …) fanno fallire il filtro di sicurezza del tool Bash con messaggi tipo "brace with quote character"/"blocked": NON è un problema di permessi né un motivo di crash-stop — cambia tool (Write/Edit) e prosegui. Il crash-stop vale solo per build/test rossi, mai per la meccanica di scrittura.
- Lavora su UNA SOLA user story per iterazione — mai più di una
- Rispetta SEMPRE le convenzioni dello stack caricato dai moduli libs
- NON saltare la verifica del build — se il build fallisce, correggilo prima del commit
- Se tutte le user stories hanno "passes": true, output esattamente: <promise>COMPLETE</promise>
"@

# ── Scrivi run-state iniziale (registra mode prima che Claude parta) ──────────
$runStatePath = Join-Path $RalphDir "run-state.json"
$runStateInit = [ordered]@{
    status          = "starting"
    currentStoryId  = $null
    mode            = if ($Mode -ne "") { $Mode } else { $null }
    runner          = $Runner
    updatedAt       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
}
$runStateInit | ConvertTo-Json | Set-Content -Path $runStatePath -Encoding utf8

# ── Esegui agente (Claude o Cursor) ───────────────────────────────────────────
$runnerLabel = if ($Runner -eq 'cursor') { 'Cursor' } else { 'Claude' }
$feedHint = if ($Runner -eq 'claude' -and -not $env:RALPH_NO_PROGRESS) { ' (feed attività live)' } else { '' }
Log "`nAvvio $runnerLabel$feedHint..." "Cyan"
if ($Json) {
    Log "Eventi attività su stderr durante il run; la prima riga può comunque tardare (tool/API)." "DarkGray"
}

$success      = $true
$errorMessage = $null

try {
    if ($Runner -eq 'cursor') {
        [void](Test-CursorRunnerPrereqs -ClaudeLibsPath $ClaudeLibsPath -ProjectDir $ProjectDir)
    }
    Invoke-RalphRunner -Prompt $prompt -ProjectDir $ProjectDir -Runner $Runner `
        -ClaudeLibsPath $ClaudeLibsPath -CursorModel $CursorModel -RalphVerbose `
        -EmitResultToStdout:(-not $Json)
} catch {
    $success      = $false
    $errorMessage = $_.Exception.Message
    if (-not $Json) {
        Write-Host "ERRORE: $errorMessage" -ForegroundColor Red
    }
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
