<#
.SYNOPSIS
    Prepara LM Studio come provider LLM locale: avvia il server, verifica il
    modello e lo carica con context length e TTL espliciti.

.DESCRIPTION
    Gemello di ensure-ollama.ps1 per il provider lmstudio, con in piu' i due
    passi che su /v1 non esistono per-request e vanno fatti al caricamento:

      lms load <id> --context-length <n> --ttl <s>

    Sono l'equivalente load-time di `num_ctx` e `keep_alive` di Ollama. Saltarli
    e' il modo piu' facile di rompere la memoria in silenzio: con un contesto
    troppo piccolo il prompt viene troncato senza errore, il modello "riassume"
    un file che ha visto a meta' e il gate Test-SyncResult scarta ogni
    risultato - sintomo confuso, non un crash.

    Passi: localizza `lms` -> la collega all'app se serve (Bionic 1.1.8+,
    vedi _lmstudio.ps1) -> `lms server start` -> attende /v1/models ->
    verifica che il modello ci sia (altrimenti suggerisce `lms get`) ->
    `lms load` -> con -Apply scrive <progetto>/.claude/models.json.

    Non tocca MAI il models.json della cartella dati di ConsoleClaude.

.PARAMETER Model
    Id del modello come lo espone LM Studio (es. qwen/qwen3-coder-30b).
    Default: LMSTUDIO_MODEL > models.json .lmstudio.model > qwen/qwen3-coder-30b.
    Nota: NON coincide con il nome Ollama (qwen3-coder:30b).

.PARAMETER Url
    Endpoint base del server, senza /v1. Default: LMSTUDIO_URL > models.json > localhost:1234.

.PARAMETER ContextLength
    Context length con cui caricare il modello. Default: models.json
    .lmstudio.contextLength > 16384. Sotto 8192 lo script avvisa.

.PARAMETER TtlSeconds
    Secondi di residenza del modello dopo l'ultima chiamata (equivalente di
    ollama.keepAlive). Default: models.json .lmstudio.ttlSeconds > 3600.

.PARAMETER ProjectDir
    Progetto su cui scrivere la configurazione con -Apply. Default: cartella corrente.

.PARAMETER Apply
    Scrive <ProjectDir>/.claude/models.json con provider lmstudio e i valori
    usati. Senza questo switch lo script stampa soltanto lo snippet da copiare.

.PARAMETER SkipLoad
    Salta `lms load`: utile se il modello e' gia' caricato con i parametri giusti.

.PARAMETER WaitSec
    Secondi massimi di attesa perche' il server risponda dopo l'avvio (default 60).

.OUTPUTS
    Exit code 0 = server attivo e modello caricato.
    Exit code 1 = `lms` assente, server non avviabile, o modello non disponibile.

.EXAMPLE
    powershell -NoProfile -File .claude\consoleclaude\tools\llm\setup-lmstudio.ps1

.EXAMPLE
    powershell -NoProfile -File .claude\consoleclaude\tools\llm\setup-lmstudio.ps1 -Apply -ContextLength 32768
#>
[CmdletBinding()]
param(
    [string]$Model = '',
    [string]$Url = '',
    [int]$ContextLength = 0,
    [int]$TtlSeconds = 0,
    [string]$ProjectDir = (Get-Location).Path,
    [switch]$Apply,
    [switch]$SkipLoad,
    [int]$WaitSec = 60,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

function Write-Info { param([string]$Msg, [string]$Color = 'DarkGray') if (-not $Quiet) { Write-Host $Msg -ForegroundColor $Color } }

. (Join-Path $PSScriptRoot '_io.ps1')
. (Join-Path $PSScriptRoot '_llm.ps1')
. (Join-Path $PSScriptRoot '_lmstudio.ps1')

# -- Risoluzione: parametro > env > models.json > default ---------------------
# -Provider lmstudio esplicito: questo script configura LM Studio anche quando
# il provider attivo e' ancora ollama, che e' il caso normale al primo setup.
$cfg = Get-LlmConfig -ProjectDir $ProjectDir `
    -Provider 'lmstudio' -Model $Model -Url $Url
$Model = $cfg.Model
$Url   = $cfg.Url
if ($ContextLength -le 0) {
    $ContextLength = if ($cfg.ContextLength) { [int]$cfg.ContextLength } else { 16384 }
}
if ($TtlSeconds -le 0) {
    $TtlSeconds = if ($null -ne $cfg.TtlSeconds) { [int]$cfg.TtlSeconds } else { 3600 }
}

Write-Info "Provider : lmstudio"
Write-Info "Modello  : $Model"
Write-Info "URL      : $Url"
Write-Info "Contesto : $ContextLength token | TTL: ${TtlSeconds}s"

if ($ContextLength -lt 8192) {
    Write-Host "[!] ContextLength $ContextLength e' sotto 8192: i prompt della memoria (file intero + commit) verranno troncati in silenzio." -ForegroundColor Yellow
}

# -- Localizza la CLI lms -----------------------------------------------------
$lms = $null
$cmd = Get-Command lms -ErrorAction SilentlyContinue
if ($cmd) { $lms = $cmd.Source }
if (-not $lms) {
    $candidates = @(
        (Join-Path $HOME '.lmstudio\bin\lms.exe'),
        (Join-Path $HOME '.cache\lm-studio\bin\lms.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\lm-studio\resources\app\.webpack\lms.exe'),
        (Join-Path $HOME '.lmstudio/bin/lms'),
        '/usr/local/bin/lms',
        '/opt/homebrew/bin/lms'
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path -LiteralPath $c -PathType Leaf)) { $lms = $c; break }
    }
}

# -- Server attivo? -----------------------------------------------------------
function Test-Server { param([int]$TimeoutSec = 3) return (Test-LlmService -Config $cfg -TimeoutSec $TimeoutSec) }

$serverUp = Test-Server

# -- Collega `lms` all'app ----------------------------------------------------
# Da Bionic 1.1.8 l'app tiene porta e chiave della CLI in apps/<app>/.internal
# e `lms` non la trova piu' da sola (vedi _lmstudio.ps1). Serve solo se `lms`
# deve davvero parlare con l'app: per avviare il server o per caricare il
# modello. LMS_API_SERVER_INFO_PATH resta impostata in questo processo, cosi'
# vale anche per `lms load` qui sotto.
if ($lms -and (-not $serverUp -or -not $SkipLoad)) {
    $bridge = Connect-LmStudioCli -LmStudioHome (Get-LmStudioHome) -WaitSec $WaitSec
    if ($bridge.Mode -eq 'bridge') {
        Write-Info "CLI collegata all'app ($($bridge.Detail)): $($bridge.InfoPath)"
    } elseif ($bridge.Mode -eq 'none') {
        Write-Info "Nessun ponte verso l'app: $($bridge.Detail)."
    }
}

if ($serverUp) {
    Write-Info "Server gia' attivo su $Url." 'Green'
} else {
    if (-not $lms) {
        Write-Host "CLI 'lms' non trovata nel PATH ne' nei percorsi noti, e il server non risponde su $Url." -ForegroundColor Red
        Write-Host "    Installa LM Studio (https://lmstudio.ai), apri l'app una volta per registrare la CLI, poi riesegui." -ForegroundColor DarkGray
        exit 1
    }
    Write-Info "Server non attivo - avvio 'lms server start'..." 'Yellow'
    # Niente `2>&1` su un eseguibile nativo: in Windows PowerShell 5.1 il
    # redirect avvolge ogni riga di stderr in un ErrorRecord e, con
    # ErrorActionPreference = Stop, un server avviato correttamente che scrive
    # su stderr verrebbe riportato come fallimento. Conta solo l'exit code.
    $startOutput = & $lms server start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Impossibile avviare il server (exit $LASTEXITCODE)." -ForegroundColor Red
        if ($startOutput) { Write-Host "    $($startOutput -join "`n    ")" -ForegroundColor DarkGray }
        exit 1
    }
    if ($startOutput) { $startOutput | ForEach-Object { Write-Info "    $_" } }
    $deadline = (Get-Date).AddSeconds($WaitSec)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 800
        if (Test-Server) { $ready = $true; break }
    }
    if (-not $ready) {
        Write-Host "Server avviato ma non pronto entro ${WaitSec}s su $Url." -ForegroundColor Yellow
        exit 1
    }
    Write-Info "Server pronto su $Url." 'Green'
}

# -- Il modello e' disponibile? -----------------------------------------------
$available = @()
try {
    $resp = Invoke-RestMethod -Method Get -Uri ($Url + '/v1/models') -TimeoutSec 10
    $available = @(Get-LlmModelIds -Response $resp -Provider 'lmstudio')
} catch { }

if ($available.Count -eq 0) {
    Write-Host "Nessun modello risulta caricato sul server." -ForegroundColor Yellow
    Write-Host "    Scarica il modello con:  lms get $Model" -ForegroundColor DarkGray
    Write-Host "    Alternative piu' leggere: qwen/qwen3-coder-14b, qwen/qwen2.5-coder-7b" -ForegroundColor DarkGray
} elseif ($available -notcontains $Model) {
    Write-Host "Modello '$Model' non fra i $($available.Count) disponibili." -ForegroundColor Yellow
    Write-Host "    Disponibili: $($available -join ', ')" -ForegroundColor DarkGray
    Write-Host "    Scarica il modello con:  lms get $Model" -ForegroundColor DarkGray
}

# -- Carica il modello con context length e TTL -------------------------------
# E' il passo che rende usabile il provider: su /v1 num_ctx e keep_alive non
# esistono per-request, quindi questo e' l'unico posto in cui si impostano.
if ($SkipLoad) {
    Write-Info "-SkipLoad: 'lms load' saltato."
} elseif (-not $lms) {
    Write-Host "[!] CLI 'lms' non trovata: impossibile eseguire 'lms load'. Carica il modello dall'app con context length $ContextLength." -ForegroundColor Yellow
} else {
    Write-Info "Carico il modello: lms load $Model --context-length $ContextLength --ttl $TtlSeconds"
    # Stesso motivo di sopra: nessun `2>&1`, si guarda l'exit code.
    $loadOutput = & $lms load $Model --context-length $ContextLength --ttl $TtlSeconds
    # Le righe di progresso sono una spinner ANSI ridisegnata centinaia di volte:
    # utili a schermo, illeggibili in un log. Si tiene solo l'esito.
    if ($loadOutput) {
        $loadOutput |
            Where-Object { $_ -notmatch 'Loading .* \d+%' -and $_ -notmatch '^\s*$' } |
            ForEach-Object { Write-Info "    $_" }
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] 'lms load' ha restituito exit $LASTEXITCODE. Verifica che il modello sia stato scaricato (lms get $Model)." -ForegroundColor Yellow
    }
}

# -- Configurazione del progetto ----------------------------------------------
$snippet = @"
{
    "llm": { "provider": "lmstudio" },
    "lmstudio": {
        "model": "$Model",
        "url": "$Url",
        "contextLength": $ContextLength,
        "ttlSeconds": $TtlSeconds
    }
}
"@

if (-not $Apply -and $Quiet) {
    # Chiamato da ensure-llm.ps1 (-Quiet): serve solo un server pronto, lo snippet da copiare non interessa.
    exit 0
}
if (-not $Apply) {
    Write-Host ""
    Write-Host "Per usare LM Studio in questo progetto, aggiungi a .claude/models.json:" -ForegroundColor Cyan
    Write-Host $snippet
    Write-Host "Oppure riesegui con -Apply. Per una sola sessione: `$env:LLM_PROVIDER = 'lmstudio'" -ForegroundColor DarkGray
    exit 0
}

# -Apply scrive SOLO il models.json del progetto: quello della cartella dati
# dell'app vale per tutti i progetti e non va toccato da uno script di setup.
$claudeDir = Join-Path $ProjectDir '.claude'
if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null }
$target = Join-Path $claudeDir 'models.json'

$existing = [ordered]@{}
if (Test-Path $target) {
    try {
        $parsed = Read-ProjectText $target | ConvertFrom-Json
        foreach ($prop in $parsed.PSObject.Properties) { $existing[$prop.Name] = $prop.Value }
    } catch {
        Write-Host "[!] $target non e' JSON valido: viene riscritto da zero." -ForegroundColor Yellow
    }
}
$existing['llm'] = [ordered]@{ provider = 'lmstudio' }
$existing['lmstudio'] = [ordered]@{
    model         = $Model
    url           = $Url
    contextLength = $ContextLength
    ttlSeconds    = $TtlSeconds
}

Write-JsonFile -Path $target -Value $existing
Write-Host "Scritto $target (provider lmstudio)." -ForegroundColor Green
exit 0
