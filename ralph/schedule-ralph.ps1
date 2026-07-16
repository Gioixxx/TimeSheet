# Schedula l'avvio automatico giornaliero di Ralph (Windows Task Scheduler).
#
# Registra/aggiorna/rimuove uno Scheduled Task che lancia ralph/ralph.ps1 in modo NON
# presidiato a un orario fisso ogni giorno. Per evitare il prompt interattivo del runner
# (ralph.ps1), il task passa sempre -Runner esplicito.
#
# Esempi:
#   powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -Time 02:00 -Iterations 15
#   powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -Time 02:00 -DryRun
#   powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -Status
#   powershell -File scripts/schedule-ralph.ps1 -ProjectDir C:\dev\my-app -Remove
#
# Prerequisiti: 'claude' autenticato e in PATH per l'utente del task. Il task gira "solo quando
# l'utente è loggato" (serve l'auth/PATH dell'utente); per "anche se non loggato" servono le
# credenziali (-LogonType Password), fuori scope di questo script.

[CmdletBinding(DefaultParameterSetName = 'Install')]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectDir,

    [Parameter(ParameterSetName = 'Install')]
    [string]$Time = "02:00",

    [Parameter(ParameterSetName = 'Install')]
    [int]$Iterations = 10,

    [Parameter(ParameterSetName = 'Install')]
    [ValidateSet('claude', 'cursor')]
    [string]$Runner = 'claude',

    [Parameter(ParameterSetName = 'Install')]
    [string]$CursorModel = "",

    [string]$ClaudeLibsPath = "",
    [string]$TaskName = "",

    [Parameter(ParameterSetName = 'Install')]
    [switch]$DryRun,

    [Parameter(ParameterSetName = 'Remove')]
    [switch]$Remove,

    [Parameter(ParameterSetName = 'Status')]
    [switch]$Status
)

$ErrorActionPreference = "Stop"

# ── Risoluzioni di base ───────────────────────────────────────────────────────
$cloneRoot = Split-Path -Parent $PSScriptRoot
$ralphPs1  = Join-Path $cloneRoot 'ralph\ralph.ps1'

$ProjectDir = (Resolve-Path -LiteralPath $ProjectDir -ErrorAction Stop).Path
if ($TaskName -eq "") {
    $TaskName = "Ralph-Daily-" + (Split-Path -Leaf $ProjectDir)
}

if (-not (Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue)) {
    throw "Il modulo ScheduledTasks non è disponibile su questo sistema (serve Windows 8+/Server 2012+)."
}

# ── -Status / -Remove (early return) ──────────────────────────────────────────
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($Status) {
    if (-not $existing) {
        Write-Host "Nessun task '$TaskName' registrato." -ForegroundColor Yellow
        exit 0
    }
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "Task:        $TaskName" -ForegroundColor Cyan
    Write-Host "Stato:       $($existing.State)"
    Write-Host "Ultimo run:  $($info.LastRunTime) (esito: $($info.LastTaskResult))"
    Write-Host "Prossimo:    $($info.NextRunTime)"
    Write-Host "Azione:      $($existing.Actions[0].Execute) $($existing.Actions[0].Arguments)"
    exit 0
}

if ($Remove) {
    if (-not $existing) {
        Write-Host "Nessun task '$TaskName' da rimuovere." -ForegroundColor Yellow
        exit 0
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "🗑️  Task '$TaskName' rimosso." -ForegroundColor Green
    exit 0
}

# ── Validazioni install ───────────────────────────────────────────────────────
if (-not (Test-Path -LiteralPath $ralphPs1)) {
    throw "ralph.ps1 non trovato in '$ralphPs1'. Esegui lo script dalla cartella scripts/ del clone claude-libs."
}

try {
    $at = [datetime]::ParseExact($Time, 'HH:mm', [System.Globalization.CultureInfo]::InvariantCulture)
} catch {
    throw "Orario non valido: '$Time'. Usa il formato HH:mm (es. 02:00)."
}

# Risolvi il path delle libs (stessa logica di ralph.ps1); fallback: la root del clone.
$libsPath = if ($ClaudeLibsPath -ne '' -and (Test-Path $ClaudeLibsPath)) {
    (Resolve-Path -LiteralPath $ClaudeLibsPath).Path
} elseif ($env:CLAUDE_LIBS_PATH -and (Test-Path $env:CLAUDE_LIBS_PATH)) {
    $env:CLAUDE_LIBS_PATH
} elseif (Test-Path (Join-Path $env:USERPROFILE '.claude_libs_path')) {
    (Get-Content (Join-Path $env:USERPROFILE '.claude_libs_path') -Raw).Trim()
} else {
    $cloneRoot
}

# Log: cartella per-progetto, creata all'install.
$logDir  = Join-Path $ProjectDir 'ralph\logs'
$logFile = Join-Path $logDir 'ralph-scheduled.log'

# ── Costruisci l'azione (powershell.exe non presidiato + log di tutti gli stream) ──
$inner = "& '$ralphPs1' -Iterations $Iterations -ProjectDir '$ProjectDir' -Runner $Runner -ClaudeLibsPath '$libsPath'"
if ($Runner -eq 'cursor' -and $CursorModel -ne '') {
    $inner += " -CursorModel '$CursorModel'"
}
$argument = "-NoProfile -ExecutionPolicy Bypass -Command `"& { $inner } *>> '$logFile'`""

$action    = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument -WorkingDirectory $ProjectDir
$trigger   = New-ScheduledTaskTrigger -Daily -At $at
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

if ($DryRun) {
    Write-Host "── DRY RUN (nessun task registrato) ─────────────────" -ForegroundColor Cyan
    Write-Host "TaskName:    $TaskName"
    Write-Host "Trigger:     ogni giorno alle $Time"
    Write-Host "Principal:   $($principal.UserId) (LogonType Interactive)"
    Write-Host "WorkingDir:  $ProjectDir"
    Write-Host "Log:         $logFile"
    Write-Host "Execute:     powershell.exe"
    Write-Host "Arguments:   $argument"
    exit 0
}

if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$desc = "Avvio giornaliero autonomo di Ralph su '$ProjectDir' (claude-libs)."
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal -Description $desc -Force | Out-Null

Write-Host "✅ Task '$TaskName' registrato: ogni giorno alle $Time → ralph.ps1 -Iterations $Iterations" -ForegroundColor Green
Write-Host "   Progetto: $ProjectDir" -ForegroundColor Gray
Write-Host "   Log:      $logFile" -ForegroundColor Gray
Write-Host "   Stato:    powershell -File scripts/schedule-ralph.ps1 -ProjectDir '$ProjectDir' -Status" -ForegroundColor Gray
Write-Host "   Rimuovi:  powershell -File scripts/schedule-ralph.ps1 -ProjectDir '$ProjectDir' -Remove" -ForegroundColor Gray
