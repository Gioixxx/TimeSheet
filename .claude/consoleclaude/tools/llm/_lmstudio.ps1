# _lmstudio.ps1 - ponte fra la CLI `lms` e un'app LM Studio che tiene i suoi
# file di servizio fuori dalla home condivisa.
#
# Da Bionic 1.1.8 (l'app LM Studio rinominata) l'app scrive http-server.json e
# lms-key-2 in <home>/apps/<app>/.internal/, mentre `lms` li cerca ancora in
# <home>/.internal/. Due sintomi:
#   - app spenta: `lms server start` la sveglia con --run-as-service, non la
#     trova e dopo 60 s esce con "Timed out waiting for LM Studio daemon";
#   - app accesa: `lms` la vede solo con LMS_API_SERVER_INFO_PATH, e anche cosi'
#     viene rifiutata ("Invalid passkey"), perche' la chiave che legge e' quella
#     rimasta nella home.
#
# Il ponte punta LMS_API_SERVER_INFO_PATH al http-server.json dell'app e copia
# la sua lms-key-2 nella home. Va rifatto a ogni avvio dell'app, che rigenera
# la chiave: per questo lo fa setup-lmstudio.ps1 (e quindi ensure-llm.ps1) e
# non un passo di installazione.
#
# Se c'e' llmster (il daemon headless) o un server nella home classica, `lms`
# funziona da solo e il ponte non tocca nulla.
#
# Uso (dot-source):
#   . (Join-Path $PSScriptRoot "_lmstudio.ps1")
#   $bridge = Connect-LmStudioCli -LmStudioHome (Get-LmStudioHome) -WaitSec 30
#
# ATTENZIONE: nessuna stringa non-ASCII nel codice, come in _llm.ps1.

function Get-LmStudioHome {
    # Stessa risoluzione di findLMStudioHome() della CLI `lms`, in sola lettura:
    # ~/.lmstudio-home-pointer > ~/.cache/lm-studio > ~/.lmstudio.
    param([string]$UserHome = $HOME)

    $pointer = Join-Path $UserHome '.lmstudio-home-pointer'
    if (Test-Path -LiteralPath $pointer -PathType Leaf) {
        $target = ([System.IO.File]::ReadAllText($pointer)).Trim()
        if ($target) { return $target }
    }
    $cacheHome = Join-Path (Join-Path $UserHome '.cache') 'lm-studio'
    if (Test-Path -LiteralPath $cacheHome -PathType Container) { return $cacheHome }
    return (Join-Path $UserHome '.lmstudio')
}

function Get-LmStudioServerInfo {
    # Legge un http-server.json ({host, pid, port}) e lo restituisce solo se il
    # processo che l'ha scritto e' ancora vivo: il file sopravvive all'app e un
    # pid morto vuol dire porta e chiave non piu' valide.
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    try {
        $info = [System.IO.File]::ReadAllText($Path) | ConvertFrom-Json
    } catch {
        return $null
    }
    $port = 0
    $procId = 0
    if (-not [int]::TryParse([string]$info.port, [ref]$port) -or $port -lt 1 -or $port -gt 65535) { return $null }
    if (-not [int]::TryParse([string]$info.pid, [ref]$procId) -or $procId -lt 1) { return $null }
    if (-not (Get-Process -Id $procId -ErrorAction SilentlyContinue)) { return $null }
    return [pscustomobject]@{ Path = $Path; Pid = $procId; Port = $port }
}

function Get-LmStudioAppDirs {
    # Cartelle <home>/apps/<app>/.internal, la piu' recente prima.
    param([Parameter(Mandatory = $true)][string]$LmStudioHome)

    $apps = Join-Path $LmStudioHome 'apps'
    if (-not (Test-Path -LiteralPath $apps -PathType Container)) { return @() }
    return @(Get-ChildItem -LiteralPath $apps -Directory |
        ForEach-Object { Join-Path $_.FullName '.internal' } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Container } |
        Sort-Object { (Get-Item -LiteralPath $_).LastWriteTime } -Descending)
}

function Find-LmStudioAppServer {
    # Il primo http-server.json di un'app con il processo vivo, o $null.
    param([Parameter(Mandatory = $true)][string]$LmStudioHome)

    foreach ($dir in (Get-LmStudioAppDirs -LmStudioHome $LmStudioHome)) {
        $info = Get-LmStudioServerInfo -Path (Join-Path $dir 'http-server.json')
        if ($info) {
            return [pscustomobject]@{ Path = $info.Path; Pid = $info.Pid; Port = $info.Port; AppInternal = $dir }
        }
    }
    return $null
}

function Start-LmStudioAppService {
    # Avvia in background la prima app con un app-install-location.json valido,
    # con lo stesso --run-as-service che usa `lms`. $true se l'ha lanciata.
    param([Parameter(Mandatory = $true)][string]$LmStudioHome)

    foreach ($dir in (Get-LmStudioAppDirs -LmStudioHome $LmStudioHome)) {
        $locFile = Join-Path $dir 'app-install-location.json'
        if (-not (Test-Path -LiteralPath $locFile -PathType Leaf)) { continue }
        try {
            $loc = [System.IO.File]::ReadAllText($locFile) | ConvertFrom-Json
        } catch {
            continue
        }
        if (-not $loc.path -or -not (Test-Path -LiteralPath $loc.path -PathType Leaf)) { continue }
        $cwd = if ($loc.cwd) { [string]$loc.cwd } else { Split-Path -Parent $loc.path }
        Start-Process -FilePath $loc.path -ArgumentList '--run-as-service' `
            -WorkingDirectory $cwd -WindowStyle Hidden | Out-Null
        return $true
    }
    return $false
}

function Connect-LmStudioCli {
    # Prepara `lms` a parlare con l'app. Restituisce {Mode, InfoPath, Detail}:
    #   native - llmster installato o server nella home classica: niente da fare
    #   bridge - LMS_API_SERVER_INFO_PATH impostata e lms-key-2 copiata
    #   none   - nessuna app da collegare; Detail dice perche'
    # Con -NoStart non avvia l'app se e' spenta (lo usano i test).
    param(
        [Parameter(Mandatory = $true)][string]$LmStudioHome,
        [int]$WaitSec = 30,
        [switch]$NoStart
    )

    $internal = Join-Path $LmStudioHome '.internal'
    if (Test-Path -LiteralPath (Join-Path $internal 'llmster-install-location.json') -PathType Leaf) {
        return [pscustomobject]@{ Mode = 'native'; InfoPath = $null; Detail = 'llmster installato' }
    }
    $classic = Get-LmStudioServerInfo -Path (Join-Path $internal 'http-server.json')
    if ($classic) {
        return [pscustomobject]@{ Mode = 'native'; InfoPath = $classic.Path; Detail = 'server nella home classica' }
    }
    if ((Get-LmStudioAppDirs -LmStudioHome $LmStudioHome).Count -eq 0) {
        return [pscustomobject]@{ Mode = 'none'; InfoPath = $null; Detail = "nessuna app sotto $LmStudioHome\apps" }
    }

    $app = Find-LmStudioAppServer -LmStudioHome $LmStudioHome
    if (-not $app -and -not $NoStart -and (Start-LmStudioAppService -LmStudioHome $LmStudioHome)) {
        $deadline = (Get-Date).AddSeconds($WaitSec)
        while (-not $app -and (Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 800
            $app = Find-LmStudioAppServer -LmStudioHome $LmStudioHome
        }
    }
    if (-not $app) {
        return [pscustomobject]@{ Mode = 'none'; InfoPath = $null; Detail = "nessuna app LM Studio attiva sotto $LmStudioHome\apps" }
    }

    $appKey = Join-Path $app.AppInternal 'lms-key-2'
    if (-not (Test-Path -LiteralPath $appKey -PathType Leaf)) {
        return [pscustomobject]@{ Mode = 'none'; InfoPath = $app.Path; Detail = "lms-key-2 assente in $($app.AppInternal)" }
    }
    if (-not (Test-Path -LiteralPath $internal -PathType Container)) {
        New-Item -ItemType Directory -Path $internal -Force | Out-Null
    }
    Copy-Item -LiteralPath $appKey -Destination (Join-Path $internal 'lms-key-2') -Force
    $env:LMS_API_SERVER_INFO_PATH = $app.Path
    return [pscustomobject]@{ Mode = 'bridge'; InfoPath = $app.Path; Detail = "app pid $($app.Pid), porta $($app.Port)" }
}
