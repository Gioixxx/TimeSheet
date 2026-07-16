# ralph/ralph-parallel.ps1
# Orchestratore parallelo — legge prd.json, schedula storie con dependsOn,
# le esegue in worktree Git isolati e aggiorna agent-state.json.
#
# Uso:
#   .\ralph\ralph-parallel.ps1 [-ProjectDir <path>] [-MaxParallel 3] [-MergeStrategy squash] [-WhatIf]
#   .\ralph\ralph-parallel.ps1 -Monitor [-MonitorInterval 3]
#
# Flag:
#   -MaxParallel      Max agenti concorrenti (default: 3)
#   -MergeStrategy    squash | merge | rebase (default: squash)
#   -Mode             Mode PromptOps da passare a ogni agente (es. sprint, detective)
#   -WhatIf           Stampa piano di esecuzione senza avviare agenti
#   -Monitor          Display-only: legge agent-state.json senza avviare job
#   -MonitorInterval  Secondi tra refresh in modalità Monitor (default: 3)
#   -ClaudeLibsPath   Path esplicito a claude-libs
#   -Runner           claude | cursor (default: claude o env RALPH_RUNNER)

param(
    [string]$ProjectDir = "",
    [string]$ClaudeLibsPath = "",
    [string]$Mode = "",
    [ValidateSet('claude', 'cursor', '')]
    [string]$Runner = '',
    [int]$MaxParallel = 3,
    [ValidateSet("squash","merge","rebase")]
    [string]$MergeStrategy = "squash",
    [switch]$WhatIf,
    [switch]$Monitor,
    [int]$MonitorInterval = 3
)

$ErrorActionPreference = "Stop"

# ── Resolve paths ──────────────────────────────────────────────────────────────
function Resolve-DefaultProjectDir {
    param([string]$Root)
    $parent = Split-Path -Parent $Root
    if ((Split-Path -Leaf $parent) -eq '.claude') { return (Split-Path -Parent $parent) }
    return $parent
}
if ($ProjectDir -eq "") { $ProjectDir = Resolve-DefaultProjectDir -Root $PSScriptRoot }

if ($Runner -eq '') {
    $Runner = if ($env:RALPH_RUNNER -in @('claude', 'cursor')) { $env:RALPH_RUNNER } else { 'claude' }
}

$RalphDir      = $PSScriptRoot
$PrdPath       = Join-Path $RalphDir "prd.json"
$StateFile     = Join-Path $RalphDir "agent-state.json"
$WorktreesBase = Join-Path $ProjectDir ".ralph-worktrees"
$RalphOncePath = Join-Path $RalphDir "ralph-once.ps1"

function Log([string]$msg, [string]$color = "White") { Write-Host $msg -ForegroundColor $color }

# ── Validate prerequisites ─────────────────────────────────────────────────────
if (-not $Monitor) {
    if (-not (Test-Path $PrdPath))       { Write-Error "prd.json non trovato: $PrdPath"; exit 1 }
    if (-not (Test-Path $RalphOncePath)) { Write-Error "ralph-once.ps1 non trovato: $RalphOncePath"; exit 1 }
}

# ── Load prd.json ──────────────────────────────────────────────────────────────
$prd = Get-Content $PrdPath -Raw | ConvertFrom-Json

function Read-StoryMap {
    $raw = Get-Content $PrdPath -Raw | ConvertFrom-Json
    $m   = @{}
    foreach ($s in $raw.userStories) { $m[$s.id] = $s }
    return $m
}
$storyMap = Read-StoryMap

# ── Topological: stories ready to run ─────────────────────────────────────────
function Get-ReadyStories([hashtable]$Map, [hashtable]$Running) {
    $ready = @()
    foreach ($id in $Map.Keys) {
        $s = $Map[$id]
        if ($s.passes) { continue }
        if ($Running.ContainsKey($id)) { continue }
        $depsOk = $true
        if ($s.PSObject.Properties['dependsOn'] -and $s.dependsOn.Count -gt 0) {
            foreach ($dep in $s.dependsOn) {
                if (-not $Map.ContainsKey($dep) -or -not $Map[$dep].passes) { $depsOk = $false; break }
            }
        }
        if ($depsOk) { $ready += $s }
    }
    return @($ready | Sort-Object priority)
}

# ── Monitor mode: display-only, polls agent-state.json ────────────────────────
if ($Monitor) {
    function Show-MonitorDashboard {
        $ts  = Get-Date
        $W   = 62
        $bar = "═" * $W

        $state   = $null
        $prdData = $null
        if (Test-Path $StateFile) {
            try { $state = Get-Content $StateFile -Raw | ConvertFrom-Json } catch { }
        }
        if (Test-Path $PrdPath) {
            try { $prdData = Get-Content $PrdPath -Raw | ConvertFrom-Json } catch { }
        }

        $elapsed = "--:--:--"
        if ($state -and $state.startedAt) {
            try {
                $t0 = [datetime]::Parse($state.startedAt)
                $dt = $ts - $t0
                $elapsed = "{0:D2}:{1:D2}:{2:D2}" -f [int]$dt.TotalHours, $dt.Minutes, $dt.Seconds
            } catch { }
        }

        Clear-Host
        Write-Host $bar -ForegroundColor Cyan
        Write-Host (" ralph-parallel Monitor   {0}   elapsed: {1}" -f $ts.ToString("HH:mm:ss"), $elapsed) -ForegroundColor Cyan
        Write-Host $bar -ForegroundColor Cyan

        if (-not $state) {
            Write-Host ""
            Write-Host " ⚠  agent-state.json non trovato — nessuna sessione attiva." -ForegroundColor Yellow
            Write-Host "    Avvia prima: .\ralph\ralph-parallel.ps1" -ForegroundColor DarkGray
            Write-Host ""
            Write-Host ("─" * $W) -ForegroundColor DarkGray
            Write-Host (" Aggiornamento: ${MonitorInterval}s | Ctrl+C per uscire") -ForegroundColor DarkGray
            return $false
        }

        Write-Host (" Session: {0}" -f $state.session) -ForegroundColor DarkGray
        Write-Host ""

        $agents    = if ($state.agents) { @($state.agents) } else { @() }
        $activeIds = @($agents | ForEach-Object { $_.storyId })
        $nRun      = ($agents | Where-Object { $_.status -eq "RUNNING"  }).Count
        $nDone     = ($agents | Where-Object { $_.status -eq "COMPLETE" }).Count
        $nErr      = ($agents | Where-Object { $_.status -eq "ERROR"    }).Count

        $queued = @()
        if ($prdData) {
            $queued = @($prdData.userStories | Where-Object {
                -not $_.passes -and $_.id -notin $activeIds
            } | Sort-Object priority)
        }

        Write-Host (" AGENTI  ⏳ running:{0}  ✅ complete:{1}  ❌ error:{2}  ○ queued:{3}" -f `
            $nRun, $nDone, $nErr, $queued.Count) -ForegroundColor White
        Write-Host (" {0}" -f ("─" * ($W - 1))) -ForegroundColor DarkGray

        if ($agents.Count -eq 0 -and $queued.Count -eq 0) {
            Write-Host " (nessun agente registrato)" -ForegroundColor DarkGray
        }

        foreach ($ag in $agents) {
            $col  = switch ($ag.status) {
                "RUNNING"  { "Cyan"  }
                "COMPLETE" { "Green" }
                "ERROR"    { "Red"   }
                default    { "Gray"  }
            }
            $icon = switch ($ag.status) {
                "RUNNING"  { "⏳" }
                "COMPLETE" { "✅" }
                "ERROR"    { "❌" }
                default    { " " }
            }
            $agEl = "—"
            if ($ag.startedAt) {
                try {
                    $t0 = [datetime]::Parse($ag.startedAt)
                    $t1 = if ($ag.completedAt) { [datetime]::Parse($ag.completedAt) } else { $ts }
                    $dt = $t1 - $t0
                    $agEl = "{0:D2}:{1:D2}" -f [int]$dt.TotalMinutes, $dt.Seconds
                } catch { }
            }
            $info = if ($ag.status -eq "ERROR" -and $ag.error) {
                $s = [string]$ag.error -replace "`n"," "
                $s.Substring(0, [Math]::Min($s.Length, 26))
            } elseif ($ag.branch) { [string]$ag.branch } else { "—" }
            $tok  = if ($ag.PSObject.Properties['tokensUsed'] -and $ag.tokensUsed) {
                "{0}t" -f $ag.tokensUsed
            } else { "—" }
            $row = " {0} {1,-8}  {2,-10}  {3,-26}  {4,-5}  {5}" -f `
                $icon, $ag.storyId, $ag.status, $info, $agEl, $tok
            Write-Host $row -ForegroundColor $col
        }

        foreach ($s in $queued) {
            $deps = if ($s.PSObject.Properties['dependsOn'] -and $s.dependsOn.Count -gt 0) {
                "deps: $($s.dependsOn -join ', ')"
            } else { "pronta" }
            Write-Host ("  ○  {0,-8}  {1,-10}  {2}" -f $s.id, "QUEUED", $deps) -ForegroundColor DarkGray
        }

        # Merge order section
        Write-Host ""
        Write-Host " MERGE ORDER" -ForegroundColor White
        if ($prdData) {
            $parts = @()
            foreach ($s in ($prdData.userStories | Sort-Object priority)) {
                $ag   = $agents | Where-Object { $_.storyId -eq $s.id } | Select-Object -First 1
                $ic   = if ($s.passes)                             { "✅" } `
                        elseif ($ag -and $ag.status -eq "RUNNING") { "⏳" } `
                        elseif ($ag -and $ag.status -eq "ERROR")   { "❌" } `
                        else                                        { "○"  }
                $parts += "$ic $($s.id)"
            }
            $line = ""
            foreach ($p in $parts) {
                $sep  = if ($line -eq "") { "" } else { " → " }
                $next = $line + $sep + $p
                if ($next.Length -gt 56 -and $line -ne "") {
                    Write-Host ("   " + $line) -ForegroundColor Gray
                    $line = $p
                } else { $line = $next }
            }
            if ($line -ne "") { Write-Host ("   " + $line) -ForegroundColor Gray }
        } else {
            Write-Host "   (prd.json non disponibile)" -ForegroundColor DarkGray
        }

        Write-Host ""
        Write-Host ("─" * $W) -ForegroundColor DarkGray
        Write-Host (" Aggiornamento: ${MonitorInterval}s | Ctrl+C per uscire") -ForegroundColor DarkGray

        # Return $true when all agents settled and all stories passed
        if ($agents.Count -gt 0 -and $prdData) {
            $anyActive = $agents | Where-Object { $_.status -in @("RUNNING","WAITING") }
            if (-not $anyActive) {
                return (-not ($prdData.userStories | Where-Object { -not $_.passes }))
            }
        }
        return $false
    }

    Write-Host "ralph-parallel — Monitor Mode" -ForegroundColor Cyan
    Write-Host "  State: $StateFile | Refresh: ${MonitorInterval}s | Ctrl+C per uscire" -ForegroundColor DarkGray
    Start-Sleep -Seconds 1
    while ($true) {
        $allDone = Show-MonitorDashboard
        if ($allDone) {
            Write-Host ""
            Write-Host " ✅ Tutti gli agenti completati — monitoraggio terminato." -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds $MonitorInterval
    }
    exit 0
}

# ── WhatIf: print execution waves and exit ─────────────────────────────────────
if ($WhatIf) {
    Log "ralph-parallel — Piano esecuzione (WhatIf)" "Cyan"
    Log "  Progetto:    $ProjectDir" "Gray"
    Log "  MaxParallel: $MaxParallel  |  Merge: $MergeStrategy" "Gray"
    Log ""
    $pending = @($prd.userStories | Where-Object { -not $_.passes })
    Log "Storie pending ($($pending.Count)):" "Yellow"
    foreach ($s in ($pending | Sort-Object priority)) {
        $deps = if ($s.PSObject.Properties['dependsOn'] -and $s.dependsOn.Count -gt 0) {
            " [deps: $($s.dependsOn -join ', ')]"
        } else { "" }
        Log "  $($s.id) (p$($s.priority))  $($s.title)$deps" "Gray"
    }
    Log ""
    # Simulate waves
    $sim = @{}
    foreach ($id in $storyMap.Keys) {
        $s = $storyMap[$id]
        $sim[$id] = [pscustomobject][ordered]@{
            id        = $s.id; title = $s.title; passes = [bool]$s.passes
            priority  = $s.priority
            dependsOn = if ($s.PSObject.Properties['dependsOn']) { @($s.dependsOn) } else { @() }
        }
    }
    $wave = 1
    $rem  = ($sim.Values | Where-Object { -not $_.passes }).Count
    while ($rem -gt 0) {
        $avail = @($sim.Values | Where-Object {
            -not $_.passes -and
            (@($_.dependsOn | Where-Object { -not $sim[$_].passes }).Count -eq 0)
        } | Sort-Object { $_.priority })
        if ($avail.Count -eq 0) { Log "⚠️  Deadlock: dipendenze circolari o non soddisfacibili." "Red"; break }
        $batch = @($avail | Select-Object -First $MaxParallel)
        Log "Wave $wave ($($batch.Count) paralleli):" "Yellow"
        foreach ($s in $batch) { Log "  → $($s.id): $($s.title)" "Cyan" }
        foreach ($s in $batch) { $sim[$s.id].passes = $true; $rem-- }
        $wave++
    }
    exit 0
}

# ── Agent state ────────────────────────────────────────────────────────────────
$sessionId    = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
$agentEntries = @{}  # storyId → ordered hashtable

function Save-AgentState {
    $obj = [ordered]@{
        session   = $sessionId
        startedAt = $sessionId
        updatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        prdPath   = $PrdPath
        agents    = @($agentEntries.Values)
    }
    $tmp = "$StateFile.tmp"
    $obj | ConvertTo-Json -Depth 10 | Set-Content -Path $tmp -Encoding utf8
    Move-Item -Path $tmp -Destination $StateFile -Force
}

function Set-AgentStatus {
    param([string]$Id, [string]$Status, [string]$Worktree = "", [string]$Branch = "",
          [string]$Err = "", [object]$ExitCode = $null)
    $now = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    if (-not $agentEntries.ContainsKey($Id)) {
        $agentEntries[$Id] = [ordered]@{
            storyId = $Id; worktree = $Worktree; branch = $Branch; status = $Status
            startedAt = $null; completedAt = $null; exitCode = $null
            mergeStrategy = $MergeStrategy; runner = $Runner; error = $null
        }
    }
    $e = $agentEntries[$Id]
    if ($Worktree -ne "") { $e.worktree = $Worktree }
    if ($Branch   -ne "") { $e.branch   = $Branch   }
    $e.status = $Status
    if ($Status -eq "RUNNING" -and $null -eq $e.startedAt) { $e.startedAt = $now }
    if ($Status -in @("COMPLETE","ERROR")) {
        $e.completedAt = $now
        if ($null -ne $ExitCode) { $e.exitCode = $ExitCode }
    }
    if ($Err -ne "") { $e.error = $Err }
    Save-AgentState
}

# ── Helpers ────────────────────────────────────────────────────────────────────
function Write-WorktreePrd([string]$TargetId, [string]$WtPath) {
    $raw = Get-Content $PrdPath -Raw | ConvertFrom-Json
    foreach ($s in $raw.userStories) {
        if ($s.id -ne $TargetId) { $s.passes = $true } else { $s.passes = $false }
    }
    $dir = Join-Path $WtPath "ralph"
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $raw | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $dir "prd.json") -Encoding utf8
}

function Merge-StoryBranch([string]$Branch, [string]$Id, [string]$Title) {
    Push-Location $ProjectDir
    try {
        $prdRel = $PrdPath.Substring($ProjectDir.Length + 1).Replace("\", "/")
        if ($MergeStrategy -eq "merge") {
            git merge $Branch -m "feat($Id): $Title [ralph-parallel]" 2>&1 | Out-Null
            git checkout HEAD -- $prdRel 2>&1 | Out-Null
        } else {
            # squash and rebase both use squash merge for simplicity
            git merge --squash $Branch --no-edit 2>&1 | Out-Null
            git restore --staged $prdRel 2>&1 | Out-Null
            git restore $prdRel 2>&1 | Out-Null
            $staged = & git diff --cached --name-only 2>$null
            if ($staged) {
                git commit -m "feat($Id): $Title [ralph-parallel]" 2>&1 | Out-Null
            }
        }
    } finally { Pop-Location }
}

function Remove-Worktree([string]$WtPath, [string]$Branch) {
    Push-Location $ProjectDir
    try {
        git worktree remove $WtPath --force 2>&1 | Out-Null
        git branch -d $Branch 2>&1 | Out-Null
    } catch { } finally { Pop-Location }
}

# ── Ensure .ralph-worktrees in .gitignore ─────────────────────────────────────
$gitIgnore = Join-Path $ProjectDir ".gitignore"
if (Test-Path $gitIgnore) {
    $gi = Get-Content $gitIgnore -Raw
    if ($gi -notmatch "\.ralph-worktrees") {
        Add-Content -Path $gitIgnore -Value "`n.ralph-worktrees/" -Encoding utf8
    }
} elseif (-not $WhatIf) {
    ".ralph-worktrees/" | Set-Content -Path $gitIgnore -Encoding utf8
}
if (-not (Test-Path $WorktreesBase)) { New-Item -ItemType Directory -Path $WorktreesBase | Out-Null }

# ── Start ─────────────────────────────────────────────────────────────────────
Log "ralph-parallel — Avvio orchestrazione" "Cyan"
Log "  Progetto:    $ProjectDir" "Gray"
Log "  MaxParallel: $MaxParallel  |  Merge: $MergeStrategy  |  Session: $sessionId" "Gray"
Log "==========================================" "Cyan"
Save-AgentState

$runningJobs       = @{}  # storyId → @{Job, WorktreePath, Branch}
$errorIds          = @{}
$preservedWorktrees = @{}  # storyId → worktreePath (merge conflict — preserved for inspection)
$pollSecs    = 5

# ── Main scheduling loop ──────────────────────────────────────────────────────
while ($true) {
    $storyMap = Read-StoryMap

    # Check completed jobs
    $finished = @($runningJobs.Keys | Where-Object {
        $runningJobs[$_].Job.State -in @("Completed","Failed","Stopped")
    })

    foreach ($sid in $finished) {
        $info   = $runningJobs[$sid]
        $job    = $info.Job
        $wtPath = $info.WorktreePath
        $branch = $info.Branch
        $story  = $storyMap[$sid]

        # Save job output to log file
        $logFile = Join-Path $WorktreesBase "$sid.log"
        Receive-Job -Job $job 2>&1 | Out-File -FilePath $logFile -Encoding utf8
        Remove-Job -Job $job -Force

        # Verify story passed in worktree prd.json
        $wtPrd   = Join-Path $wtPath "ralph\prd.json"
        $passed  = $false
        if (Test-Path $wtPrd) {
            try {
                $prdObj = Get-Content $wtPrd -Raw | ConvertFrom-Json
                $passed = [bool]($prdObj.userStories | Where-Object { $_.id -eq $sid -and $_.passes })
            } catch { }
        }

        if ($job.State -eq "Completed" -and $passed) {
            Log "  ✅ $sid completato — merge ($MergeStrategy)..." "Green"
            try {
                Merge-StoryBranch -Branch $branch -Id $sid -Title $story.title
                # Update main prd.json programmatically
                $rawPrd = Get-Content $PrdPath -Raw | ConvertFrom-Json
                foreach ($s in $rawPrd.userStories) { if ($s.id -eq $sid) { $s.passes = $true } }
                $rawPrd | ConvertTo-Json -Depth 10 | Set-Content -Path $PrdPath -Encoding utf8
                Set-AgentStatus -Id $sid -Status "COMPLETE" -ExitCode 0
                Log "  ✅ ${sid}: merge ok" "Green"
            } catch {
                $msg = $_.Exception.Message
                Log "  ❌ ${sid}: merge fallito — $msg" "Red"
                Log "     Worktree preservato per ispezione: $wtPath" "Yellow"
                $errorIds[$sid] = $msg
                $preservedWorktrees[$sid] = $wtPath
                Set-AgentStatus -Id $sid -Status "ERROR" -Err $msg -ExitCode 1
            }
        } else {
            $reason = if ($job.State -ne "Completed") { "Job PS fallito ($($job.State))" } else { "prd.json: passes rimasto false" }
            Log "  ❌ ${sid}: $reason" "Red"
            $errorIds[$sid] = $reason
            Set-AgentStatus -Id $sid -Status "ERROR" -Err $reason -ExitCode 1
        }

        if (-not $preservedWorktrees.ContainsKey($sid)) {
            Remove-Worktree -WtPath $wtPath -Branch $branch
        }
        $runningJobs.Remove($sid)
    }

    # Reload after merges
    $storyMap = Read-StoryMap
    if (-not ($storyMap.Values | Where-Object { -not $_.passes })) {
        Log "`n✅ Tutte le storie completate!" "Green"; break
    }

    # Start new agents
    $ready = Get-ReadyStories -Map $storyMap -Running $runningJobs
    $slots = $MaxParallel - $runningJobs.Count

    foreach ($story in ($ready | Select-Object -First $slots)) {
        $sid    = $story.id
        $branch = "ralph/$sid"
        $wtPath = Join-Path $WorktreesBase $sid

        # Remove stale worktree
        if (Test-Path $wtPath) {
            Push-Location $ProjectDir
            git worktree remove $wtPath --force 2>&1 | Out-Null
            Pop-Location
            Remove-Item $wtPath -Recurse -Force -ErrorAction SilentlyContinue
        }

        Log "`n→ Avvio ${sid}: $($story.title)" "Cyan"

        try {
            Push-Location $ProjectDir
            git worktree add $wtPath -b $branch 2>&1 | Out-Null
            Pop-Location

            Write-WorktreePrd -TargetId $sid -WtPath $wtPath

            $wtOnce = Join-Path $wtPath "ralph\ralph-once.ps1"
            if (-not (Test-Path $wtOnce)) { $wtOnce = Join-Path $wtPath ".claude\ralph\ralph-once.ps1" }
            if (-not (Test-Path $wtOnce)) { $wtOnce = $RalphOncePath }  # fallback to main copy

            $cWt     = $wtPath
            $cLibs   = $ClaudeLibsPath
            $cOnce   = $wtOnce
            $cMode   = $Mode
            $cRunner = $Runner

            $job = Start-Job -ScriptBlock {
                param($wt, $libs, $once, $mode, $runner)
                $env:NODE_OPTIONS = ""
                $args = @{ ProjectDir = $wt; Runner = $runner }
                if ($libs -ne "") { $args['ClaudeLibsPath'] = $libs }
                if ($mode -ne "") { $args['Mode'] = $mode }
                & $once @args
            } -ArgumentList $cWt, $cLibs, $cOnce, $cMode, $cRunner

            $runningJobs[$sid] = @{ Job = $job; WorktreePath = $wtPath; Branch = $branch }
            Set-AgentStatus -Id $sid -Status "RUNNING" -Worktree $wtPath -Branch $branch
            Log "  Branch: $branch | Job PS ID: $($job.Id)" "Gray"

        } catch {
            $msg = $_.Exception.Message
            Log "  ❌ Impossibile avviare ${sid}: $msg" "Red"
            $errorIds[$sid] = $msg
            Set-AgentStatus -Id $sid -Status "ERROR" -Err $msg
            try { Pop-Location } catch { }
        }
    }

    # Stall detection
    $pendingNonErr = @($storyMap.Values | Where-Object {
        -not $_.passes -and -not $errorIds.ContainsKey($_.id)
    })
    if ($pendingNonErr.Count -gt 0 -and $runningJobs.Count -eq 0 -and $ready.Count -eq 0) {
        Log "`n⚠️  Stallo: $($pendingNonErr.Count) storie bloccate da dipendenze in errore." "Yellow"
        break
    }

    # Status line
    if ($runningJobs.Count -gt 0) {
        Log "  [$(Get-Date -Format 'HH:mm:ss')] Running ($($runningJobs.Count)/$MaxParallel): $($runningJobs.Keys -join ', ')" "DarkGray"
        Start-Sleep -Seconds $pollSecs
    } else {
        Start-Sleep -Seconds 1
    }
}

# ── Summary ────────────────────────────────────────────────────────────────────
$finalMap = Read-StoryMap
$nPassed  = ($finalMap.Values | Where-Object { $_.passes }).Count
$nTotal   = $finalMap.Count
$nErr     = $errorIds.Count

Log ""
Log "════════════════════════════════════════" "Cyan"
Log "ralph-parallel — Sessione $sessionId" "Cyan"
Log "Storie completate: $nPassed/$nTotal" "$(if ($nPassed -eq $nTotal) { 'Green' } else { 'Yellow' })"
if ($nErr -gt 0) { Log "Errori ($nErr): $($errorIds.Keys -join ', ')" "Red" }
if ($preservedWorktrees.Count -gt 0) {
    Log "Worktree preservati (merge conflict):" "Yellow"
    foreach ($sid in $preservedWorktrees.Keys) {
        Log "  $sid → $($preservedWorktrees[$sid])" "Yellow"
    }
}
Log "Log worktrees: $WorktreesBase\*.log" "Gray"
Log "State file:    $StateFile" "Gray"

if ($nErr -gt 0) { exit 1 } else { exit 0 }
