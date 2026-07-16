# Invoke-OllamaGenerate.ps1 - chiamata locale a Ollama /api/generate (best-effort).
# Convenzioni allineate a mcp/ollama-sidecar e scripts/ralph/ralph_gen.py:
#   OLLAMA_URL (default http://localhost:11434), OLLAMA_MODEL (default qwen3-coder:30b),
#   OLLAMA_TIMEOUT (secondi, default 120). Tra env e default si consulta models.json
#   (progetto > libreria, vedi Resolve-ModelsConfig.ps1).

# Riusa Resolve-RalphRefPath per Build-OllamaContext (doppio dot-source innocuo).
. (Join-Path $PSScriptRoot 'Expand-RalphPrompt.ps1')
. (Join-Path $PSScriptRoot 'Resolve-ModelsConfig.ps1')

function Invoke-OllamaGenerate {
    # Ritorna il testo generato, o $null su qualunque errore (Ollama offline,
    # timeout, modello mancante). Mai eccezioni: il chiamante degrada con warning.
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,

        [string]$Model = '',
        [string]$Url = '',
        [int]$TimeoutSec = 0
    )

    if ($Model -eq '' -or $Url -eq '') {
        $cfg = Get-ModelsConfig -ProjectDir (Get-Location).Path
        if ($Model -eq '') {
            $Model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL }
                     elseif ($cfg.OllamaModel) { $cfg.OllamaModel }
                     else { 'qwen3-coder:30b' }
        }
        if ($Url -eq '') {
            $Url = if ($env:OLLAMA_URL) { $env:OLLAMA_URL }
                   elseif ($cfg.OllamaUrl) { $cfg.OllamaUrl }
                   else { 'http://localhost:11434' }
        }
    }
    if ($TimeoutSec -le 0) {
        $TimeoutSec = if ($env:OLLAMA_TIMEOUT -match '^\d+$') { [int]$env:OLLAMA_TIMEOUT } else { 120 }
    }

    try {
        # num_ctx alto: Build-OllamaContext inietta fino a 24000 char di contesto
        # nel prompt; col default Ollama (4096) verrebbe troncato in silenzio.
        $payload = @{ model = $Model; prompt = $Prompt; stream = $false; options = @{ num_ctx = 16384 } } |
            ConvertTo-Json -Compress -Depth 4
        # Body in byte UTF-8 espliciti: Invoke-RestMethod su PS 5.1 altrimenti
        # invia le stringhe con charset di default e corrompe i non-ASCII.
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $resp = Invoke-RestMethod -Method Post -Uri ($Url.TrimEnd('/') + '/api/generate') `
            -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec $TimeoutSec
        $text = [string]$resp.response
        if ($text -and $text.Trim()) { return $text.Trim() }
        return $null
    } catch {
        return $null
    }
}

function Build-OllamaContext {
    # Espande le righe @ref di un context block in blocchi FILE inline con cap di
    # dimensione (Ollama riceve il contesto nel prompt, non risolve i riferimenti).
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$ContextBlock,

        [Parameter(Mandatory = $true)]
        [string]$ProjectDir,

        [string]$ClaudeLibsPath = '',
        [int]$PerFileCap = 8000,
        [int]$TotalCap = 24000
    )

    $sb = New-Object System.Text.StringBuilder
    foreach ($line in ($ContextBlock -split "`r?`n")) {
        $ref = $line.Trim()
        if ($ref -notmatch '^@') { continue }
        $path = Resolve-RalphRefPath -Ref $ref -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath
        if (-not $path -or -not (Test-Path $path -PathType Leaf)) { continue }
        $content = Get-Content -Path $path -Raw -Encoding utf8
        if ($null -eq $content) { continue }
        if ($content.Length -gt $PerFileCap) {
            $content = $content.Substring(0, $PerFileCap) + "`n[...troncato...]"
        }
        [void]$sb.AppendLine("--- FILE: $($ref.Substring(1)) ---")
        [void]$sb.AppendLine($content)
        [void]$sb.AppendLine("--- END FILE ---")
        if ($sb.Length -ge $TotalCap) { break }
    }

    $text = $sb.ToString()
    if ($text.Length -gt $TotalCap) {
        $text = $text.Substring(0, $TotalCap) + "`n[...contesto troncato...]"
    }
    return $text
}
