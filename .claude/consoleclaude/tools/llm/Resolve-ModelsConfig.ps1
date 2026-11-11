# Resolve-ModelsConfig.ps1 - lettura di models.json (stessi livelli del client Python dell'app).
# Precedenza complessiva (applicata dai chiamanti): parametro esplicito > env var >
# file indicato da CONSOLECLAUDE_MODELS > <progetto>/.claude/models.json >
# cartella dati di ConsoleClaude (%APPDATA%\ConsoleClaude\models.json) > default hardcoded.
# Questo file copre solo i livelli file: merge per chiave, fail-silent
# (file mancante o JSON rotto -> livello ignorato).
#
# Un url (ollama.url, lmstudio.url) che viene dal models.json del PROGETTO vale solo se
# l'host e' locale (Test-LocalModelUrl, stessa regola di is_local_url in llm_client.py):
# un repository non sceglie verso quale host l'app apre connessioni. Se non lo e', quel
# livello si salta per quella chiave e si passa al successivo. Un host remoto lo sceglie
# l'utente con la variabile d'ambiente, con CONSOLECLAUDE_MODELS o nel models.json dei
# dati dell'app.

function Read-ModelsConfigFile {
    param([string]$Path)

    if (-not $Path -or -not (Test-Path $Path -PathType Leaf)) { return $null }
    try {
        return Get-Content $Path -Raw -Encoding utf8 | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Test-LocalModelUrl {
    # True se $Url e' una stringa http(s) con host localhost, 127.0.0.1 o [::1], porta
    # numerica (0-65535) facoltativa, e niente che i parser leggono in modo diverso:
    # credenziali o '@', backslash, spazi, caratteri di controllo (<= 0x20 e 0x7F).
    # Come is_local_url di llm_client.py, o piu' severa (mai piu' larga).
    param($Url)

    if ($Url -isnot [string]) { return $false }
    foreach ($ch in $Url.ToCharArray()) {
        $code = [int]$ch
        if ($code -eq 92 -or $code -eq 64 -or $code -le 32 -or $code -eq 127) { return $false }
    }
    $opts = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::CultureInvariant
    $m = [regex]::Match($Url, '^https?://(localhost|127\.0\.0\.1|\[::1\])(:([0-9]{0,5}))?([/?#].*)?\z', $opts)
    if (-not $m.Success) { return $false }
    $port = $m.Groups[3].Value
    if ($port -ne '' -and [int]$port -gt 65535) { return $false }
    return $true
}

function Get-ModelsConfig {
    # Ritorna una hashtable con i valori risolti dai file (il primo livello che ha la chiave vince);
    # chiavi assenti -> $null. Le chiavi si aggiungono, non si rinominano: i
    # consumatori leggono per nome, quindi estendere e' a impatto zero.
    #   ClaudeModel, OllamaModel, OllamaUrl, OllamaKeepAlive,
    #   Provider, LmStudioModel, LmStudioUrl, LmStudioContextLength, LmStudioTtlSeconds
    param(
        [string]$ProjectDir = ''
    )

    # Ogni candidato: percorso e se viene dal repository (solo il models.json del progetto).
    $candidates = @()
    if ($env:CONSOLECLAUDE_MODELS) { $candidates += , @($env:CONSOLECLAUDE_MODELS, $false) }
    if ($ProjectDir) { $candidates += , @((Join-Path $ProjectDir '.claude\models.json'), $true) }
    if ($env:APPDATA) { $candidates += , @((Join-Path (Join-Path $env:APPDATA 'ConsoleClaude') 'models.json'), $false) }

    $result = @{
        ClaudeModel           = $null
        OllamaModel           = $null
        OllamaUrl             = $null
        OllamaKeepAlive       = $null
        Provider              = $null
        LmStudioModel         = $null
        LmStudioUrl           = $null
        LmStudioContextLength = $null
        LmStudioTtlSeconds    = $null
    }
    foreach ($candidate in $candidates) {
        $path = $candidate[0]
        $fromRepo = [bool]$candidate[1]
        $cfg = Read-ModelsConfigFile -Path $path
        if ($null -eq $cfg) { continue }
        $ollamaUrl = $cfg.ollama.url
        $lmStudioUrl = $cfg.lmstudio.url
        if ($fromRepo) {
            if ($ollamaUrl -and -not (Test-LocalModelUrl ([string]$ollamaUrl))) {
                Write-Warning "ollama.url in .claude/models.json del progetto non e' un host locale: ignorato."
                $ollamaUrl = $null
            }
            if ($lmStudioUrl -and -not (Test-LocalModelUrl ([string]$lmStudioUrl))) {
                Write-Warning "lmstudio.url in .claude/models.json del progetto non e' un host locale: ignorato."
                $lmStudioUrl = $null
            }
        }
        if (-not $result.ClaudeModel     -and $cfg.claude.model)          { $result.ClaudeModel     = [string]$cfg.claude.model }
        if (-not $result.OllamaModel     -and $cfg.ollama.model)          { $result.OllamaModel     = [string]$cfg.ollama.model }
        if (-not $result.OllamaUrl       -and $ollamaUrl)                 { $result.OllamaUrl       = [string]$ollamaUrl }
        if (-not $result.OllamaKeepAlive -and $cfg.ollama.keepAlive)      { $result.OllamaKeepAlive = [string]$cfg.ollama.keepAlive }
        if (-not $result.Provider        -and $cfg.llm.provider)          { $result.Provider        = [string]$cfg.llm.provider }
        if (-not $result.LmStudioModel   -and $cfg.lmstudio.model)        { $result.LmStudioModel   = [string]$cfg.lmstudio.model }
        if (-not $result.LmStudioUrl     -and $lmStudioUrl)               { $result.LmStudioUrl     = [string]$lmStudioUrl }
        if (-not $result.LmStudioContextLength -and $cfg.lmstudio.contextLength) { $result.LmStudioContextLength = [int]$cfg.lmstudio.contextLength }
        if ($null -eq $result.LmStudioTtlSeconds -and $null -ne $cfg.lmstudio.ttlSeconds) { $result.LmStudioTtlSeconds = [int]$cfg.lmstudio.ttlSeconds }
    }
    return $result
}
