<#
.SYNOPSIS
    Verifica che il server Ollama sia attivo e, se non lo e', lo avvia in automatico.

.DESCRIPTION
    Pensato per essere chiamato all'inizio di sessione (es. da /session-start) prima di
    usare il sidecar. Interroga /api/tags: se risponde, esce subito. Altrimenti
    localizza l'eseguibile `ollama`, avvia `ollama serve` in background e attende che il
    server diventi pronto. Non lancia mai eccezioni bloccanti: in caso di problemi stampa
    un warning con hint e restituisce exit code != 0 (il chiamante prosegue senza sidecar).

    URL risolto come negli altri script: -Url > OLLAMA_URL > models.json > default.

.PARAMETER Url
    URL del server Ollama. Default risolto da OLLAMA_URL / models.json / localhost:11434.

.PARAMETER WaitSec
    Secondi massimi di attesa perche' il server diventi pronto dopo l'avvio (default 30).

.PARAMETER Quiet
    Riduce l'output allo stretto necessario.

.OUTPUTS
    Exit code 0 = server attivo (gia' su o avviato con successo).
    Exit code 1 = server non attivo e non avviabile (eseguibile assente o timeout).

.EXAMPLE
    powershell -NoProfile -File .claude\consoleclaude\tools\llm\ensure-ollama.ps1
#>
[CmdletBinding()]
param(
    [string]$Url = '',
    [int]$WaitSec = 30,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

function Write-Info { param([string]$Msg, [string]$Color = 'DarkGray') if (-not $Quiet) { Write-Host $Msg -ForegroundColor $Color } }

# -- Risoluzione URL (parametro > env > models.json > default) -----------------
if ($Url -eq '') {
    $Url = if ($env:OLLAMA_URL) { $env:OLLAMA_URL } else { '' }
    if ($Url -eq '') {
        try {
            . (Join-Path $PSScriptRoot 'Resolve-ModelsConfig.ps1')
            $cfg = Get-ModelsConfig -ProjectDir (Get-Location).Path
            if ($cfg.OllamaUrl) { $Url = $cfg.OllamaUrl }
        } catch { }
    }
    if ($Url -eq '') { $Url = 'http://localhost:11434' }
}
$Url = $Url.TrimEnd('/')

# -- Test di raggiungibilita' -------------------------------------------------
function Test-Ollama {
    param([int]$TimeoutSec = 3)
    try {
        $null = Invoke-RestMethod -Uri "$Url/api/tags" -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

if (Test-Ollama) {
    Write-Info "Ollama gia' attivo su $Url." 'Green'
    exit 0
}

Write-Info "Ollama non risponde su $Url - provo ad avviarlo..." 'Yellow'

# -- Localizza l'eseguibile ollama --------------------------------------------
$exe = $null
$cmd = Get-Command ollama -ErrorAction SilentlyContinue
if ($cmd) { $exe = $cmd.Source }
if (-not $exe) {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'),
        (Join-Path $env:ProgramFiles 'Ollama\ollama.exe'),
        '/usr/local/bin/ollama',
        '/usr/bin/ollama',
        '/opt/homebrew/bin/ollama'
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path -LiteralPath $c -PathType Leaf)) { $exe = $c; break }
    }
}

if (-not $exe) {
    Write-Host "Ollama non trovato nel PATH ne' nei percorsi noti. Installa Ollama (https://ollama.com) o avvialo a mano (`ollama serve`)." -ForegroundColor Red
    exit 1
}

# -- Avvia il server in background --------------------------------------------
try {
    Start-Process -FilePath $exe -ArgumentList 'serve' -WindowStyle Hidden | Out-Null
} catch {
    Write-Host "Impossibile avviare 'ollama serve': $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# -- Attendi che diventi pronto -----------------------------------------------
$deadline = (Get-Date).AddSeconds($WaitSec)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 800
    if (Test-Ollama) {
        Write-Info "Ollama avviato e pronto su $Url." 'Green'
        exit 0
    }
}

Write-Host "Ollama avviato ma non pronto entro ${WaitSec}s. Riprova tra qualche secondo o controlla il servizio." -ForegroundColor Yellow
exit 1
