# Resolve-ModelsConfig.ps1 - lettura di models.json (globale + override progetto).
# Precedenza complessiva (applicata dai chiamanti): parametro esplicito > env var >
# <progetto>/.claude/models.json > <claude-libs>/models.json > default hardcoded.
# Questo file copre solo i due livelli file: merge per chiave, fail-silent
# (file mancante o JSON rotto -> livello ignorato).

function Read-ModelsConfigFile {
    param([string]$Path)

    if (-not $Path -or -not (Test-Path $Path -PathType Leaf)) { return $null }
    try {
        return Get-Content $Path -Raw -Encoding utf8 | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Get-ModelsConfig {
    # Ritorna una hashtable @{ ClaudeModel = ...; OllamaModel = ...; OllamaUrl = ... }
    # con i valori risolti dai file (progetto > libreria); chiavi assenti -> $null.
    param(
        [string]$ProjectDir = '',
        [string]$ClaudeLibsPath = ''
    )

    if ($ClaudeLibsPath -eq '') {
        $ClaudeLibsPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    }
    $candidates = @()
    if ($ProjectDir) { $candidates += (Join-Path $ProjectDir '.claude\models.json') }
    $candidates += (Join-Path $ClaudeLibsPath 'models.json')
    # Fallback al clone canonico se lo script gira da una copia senza models.json.
    $candidates += (Join-Path $HOME '.claude\claude-libs\models.json')

    $result = @{ ClaudeModel = $null; OllamaModel = $null; OllamaUrl = $null }
    foreach ($path in $candidates) {
        $cfg = Read-ModelsConfigFile -Path $path
        if ($null -eq $cfg) { continue }
        if (-not $result.ClaudeModel -and $cfg.claude.model) { $result.ClaudeModel = [string]$cfg.claude.model }
        if (-not $result.OllamaModel -and $cfg.ollama.model) { $result.OllamaModel = [string]$cfg.ollama.model }
        if (-not $result.OllamaUrl   -and $cfg.ollama.url)   { $result.OllamaUrl   = [string]$cfg.ollama.url }
        if ($result.ClaudeModel -and $result.OllamaModel -and $result.OllamaUrl) { break }
    }
    return $result
}
