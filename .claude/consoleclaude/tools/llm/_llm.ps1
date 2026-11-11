# _llm.ps1 - client PowerShell del provider LLM locale (Ollama | LM Studio).
#
# Gemello del client Python dell'app (llm_client.py): stessa semantica di risoluzione, stessa
# traduzione del trasporto, stessi default. Se ne cambi uno, cambia l'altro.
#
#   provider := LLM_PROVIDER > models.json .llm.provider > "ollama"
#   ollama   -> POST /api/generate        {prompt, options, format, keep_alive} -> .response
#   lmstudio -> POST /v1/chat/completions {messages, max_tokens, response_format}
#                                         -> .choices[0].message.content
#
# num_ctx e keep_alive non esistono per-request su /v1: sono load-time
# (lms load --context-length --ttl) e vengono omessi dal payload.
#
# Uso (dot-source):
#   . (Join-Path $PSScriptRoot "_llm.ps1")
#   $cfg = Get-LlmConfig -ProjectDir $dir
#   $text = Invoke-LlmGenerate -Prompt $p -Config $cfg -MaxTokens 4096
#
# Nessuna funzione qui solleva eccezioni: il chiamante degrada con un warning.
#
# ATTENZIONE: nessuna stringa non-ASCII nel CODICE (solo nei commenti). Questo
# file viene installato in .claude/consoleclaude/tools/llm/ senza BOM, e Windows
# PowerShell 5.1 legge un .ps1 UTF-8 senza BOM con la code page ANSI.

# Resolve-ModelsConfig.ps1 sta nella stessa cartella.
$script:LlmModelsConfigLoaded = $false
$cand = Join-Path $PSScriptRoot 'Resolve-ModelsConfig.ps1'
if (Test-Path $cand -PathType Leaf) {
    . $cand
    $script:LlmModelsConfigLoaded = $true
}

$script:LlmDefaults = @{
    ollama   = @{ Url = 'http://localhost:11434'; Model = 'qwen3-coder:30b' }
    lmstudio = @{ Url = 'http://localhost:1234';  Model = 'qwen/qwen3-coder-30b' }
}

function Get-LlmGeneratePath([string]$Provider) {
    if ($Provider -eq 'lmstudio') { return '/v1/chat/completions' }
    return '/api/generate'
}

function Get-LlmHealthPath([string]$Provider) {
    if ($Provider -eq 'lmstudio') { return '/v1/models' }
    return '/api/tags'
}

function Get-LlmConfig {
    # Configurazione effettiva del provider attivo. Precedenza:
    # parametro esplicito > env var > models.json (CONSOLECLAUDE_MODELS > progetto > dati dell'app) > default.
    # Non solleva mai: senza Resolve-ModelsConfig.ps1 restano env var e default.
    param(
        [string]$ProjectDir = '',
        [string]$Provider = '',
        [string]$Model = '',
        [string]$Url = '',
        [int]$TimeoutSec = 0
    )

    $cfg = $null
    if ($script:LlmModelsConfigLoaded) {
        try {
            $cfg = Get-ModelsConfig -ProjectDir $ProjectDir
        } catch {
            $cfg = $null
        }
    }

    if ($Provider -eq '') {
        $Provider = if ($env:LLM_PROVIDER) { $env:LLM_PROVIDER }
                    elseif ($cfg -and $cfg.Provider) { $cfg.Provider }
                    else { 'ollama' }
    }
    $Provider = $Provider.Trim().ToLowerInvariant()
    if ($script:LlmDefaults.Keys -notcontains $Provider) {
        # Fail-open: un valore ignoto non blocca.
        Write-Verbose "[_llm] provider sconosciuto '$Provider', uso ollama"
        $Provider = 'ollama'
    }
    $defaults = $script:LlmDefaults[$Provider]

    if ($Url -eq '') {
        if ($Provider -eq 'lmstudio') {
            $Url = if ($env:LMSTUDIO_URL) { $env:LMSTUDIO_URL }
                   elseif ($cfg -and $cfg.LmStudioUrl) { $cfg.LmStudioUrl }
                   else { $defaults.Url }
        } else {
            $Url = if ($env:OLLAMA_URL) { $env:OLLAMA_URL }
                   elseif ($cfg -and $cfg.OllamaUrl) { $cfg.OllamaUrl }
                   else { $defaults.Url }
        }
    }
    if ($Model -eq '') {
        if ($Provider -eq 'lmstudio') {
            $Model = if ($env:LMSTUDIO_MODEL) { $env:LMSTUDIO_MODEL }
                     elseif ($cfg -and $cfg.LmStudioModel) { $cfg.LmStudioModel }
                     else { $defaults.Model }
        } else {
            $Model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL }
                     elseif ($cfg -and $cfg.OllamaModel) { $cfg.OllamaModel }
                     else { $defaults.Model }
        }
    }
    if ($TimeoutSec -le 0) {
        # OLLAMA_TIMEOUT vale per ENTRAMBI i provider: un LMSTUDIO_TIMEOUT
        # raddoppierebbe la superficie per zero valore.
        $TimeoutSec = if ($env:OLLAMA_TIMEOUT -match '^\d+$') { [int]$env:OLLAMA_TIMEOUT } else { 120 }
    }

    # keep_alive e' per-request solo su Ollama; su lmstudio e' lms load --ttl.
    $keepAlive = $null
    if ($Provider -eq 'ollama') {
        $keepAlive = if ($env:OLLAMA_KEEP_ALIVE) { $env:OLLAMA_KEEP_ALIVE }
                     elseif ($cfg -and $cfg.OllamaKeepAlive) { $cfg.OllamaKeepAlive }
                     else { $null }
    }

    return @{
        Provider      = $Provider
        Url           = $Url.TrimEnd('/')
        Model         = $Model
        TimeoutSec    = $TimeoutSec
        KeepAlive     = $keepAlive
        GeneratePath  = (Get-LlmGeneratePath $Provider)
        HealthPath    = (Get-LlmHealthPath $Provider)
        Label         = $(if ($Provider -eq 'lmstudio') { 'LM Studio' } else { 'Ollama' })
        ContextLength = $(if ($cfg) { $cfg.LmStudioContextLength } else { $null })
        TtlSeconds    = $(if ($cfg) { $cfg.LmStudioTtlSeconds } else { $null })
    }
}

function ConvertTo-LlmResponseFormat {
    # JSON schema Ollama -> response_format OpenAI. strict=false deliberato: lo
    # strict mode pretende additionalProperties:false e un required completo,
    # che gli schemi del sidecar non rispettano tutti.
    param(
        [Parameter(Mandatory = $true)]$Schema,
        [string]$Name = 'response'
    )
    return @{
        type        = 'json_schema'
        json_schema = @{ name = $Name; strict = $false; schema = $Schema }
    }
}

function Build-LlmPayload {
    # Corpo della richiesta nella forma nativa del provider. Le opzioni sono
    # sempre espresse nel vocabolario Ollama e tradotte qui per lmstudio.
    param(
        [Parameter(Mandatory = $true)][string]$Provider,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Prompt,
        [Parameter(Mandatory = $true)][string]$Model,
        [int]$MaxTokens = 0,
        [double]$Temperature = -1,
        [int]$NumCtx = 0,
        [string]$KeepAlive = '',
        $Format = $null
    )

    if ($Provider -eq 'lmstudio') {
        $payload = [ordered]@{
            model    = $Model
            messages = @(@{ role = 'user'; content = $Prompt })
            stream   = $false
        }
        if ($MaxTokens -gt 0)   { $payload['max_tokens'] = $MaxTokens }
        if ($Temperature -ge 0) { $payload['temperature'] = $Temperature }
        if ($null -ne $Format)  { $payload['response_format'] = (ConvertTo-LlmResponseFormat $Format) }
        # num_ctx e keep_alive: nessun equivalente per-request, omessi.
        return $payload
    }

    $options = [ordered]@{}
    if ($NumCtx -gt 0)      { $options['num_ctx'] = $NumCtx }
    if ($MaxTokens -gt 0)   { $options['num_predict'] = $MaxTokens }
    if ($Temperature -ge 0) { $options['temperature'] = $Temperature }

    $payload = [ordered]@{
        model   = $Model
        prompt  = $Prompt
        stream  = $false
        options = $options
    }
    if ($null -ne $Format) { $payload['format'] = $Format }
    if ($KeepAlive)        { $payload['keep_alive'] = $KeepAlive }
    return $payload
}

function Get-LlmResponseText {
    # Estrae il testo generato dalla risposta deserializzata. Stringa vuota se
    # la forma non e' quella attesa: i chiamanti trattano gia' "" come
    # risposta inutilizzabile.
    param([Parameter(Mandatory = $true)][AllowNull()]$Response, [string]$Provider = 'ollama')

    if ($null -eq $Response) { return '' }
    $text = $null
    if ($Provider -eq 'lmstudio') {
        try {
            $choice = @($Response.choices)[0]
            if ($null -eq $choice) { return '' }
            $text = [string]$choice.message.content
        } catch {
            return ''
        }
    } else {
        $text = [string]$Response.response
    }
    if ($null -eq $text) { return '' }
    return $text.Trim()
}

function Get-LlmModelIds {
    # Id dei modelli disponibili: .models[].name (ollama) o .data[].id (/v1).
    param([Parameter(Mandatory = $true)][AllowNull()]$Response, [string]$Provider = 'ollama')

    if ($null -eq $Response) { return @() }
    try {
        if ($Provider -eq 'lmstudio') {
            return @($Response.data | ForEach-Object { [string]$_.id })
        }
        return @($Response.models | ForEach-Object { [string]$_.name })
    } catch {
        return @()
    }
}

function Invoke-LlmGenerate {
    # Ritorna il testo generato, o $null su qualunque errore (provider offline,
    # timeout, modello mancante). Mai eccezioni: il chiamante degrada.
    param(
        [Parameter(Mandatory = $true)][string]$Prompt,
        $Config = $null,
        [string]$ProjectDir = '',
        [string]$Provider = '',
        [string]$Model = '',
        [string]$Url = '',
        [int]$TimeoutSec = 0,
        [int]$MaxTokens = 0,
        [double]$Temperature = -1,
        [int]$NumCtx = 0,
        $Format = $null
    )

    if ($null -eq $Config) {
        $Config = Get-LlmConfig -ProjectDir $ProjectDir -Provider $Provider `
            -Model $Model -Url $Url -TimeoutSec $TimeoutSec
    }

    try {
        $keepAlive = if ($Config.KeepAlive) { [string]$Config.KeepAlive } else { '' }
        $payload = Build-LlmPayload -Provider $Config.Provider -Prompt $Prompt `
            -Model $Config.Model -MaxTokens $MaxTokens -Temperature $Temperature `
            -NumCtx $NumCtx -KeepAlive $keepAlive -Format $Format
        # Depth 10: response_format annida lo schema di tre livelli, e il default
        # di ConvertTo-Json (2) lo troncherebbe in "System.Object[]".
        $json = $payload | ConvertTo-Json -Compress -Depth 10
        # Body in byte UTF-8 espliciti: Invoke-RestMethod su PS 5.1 altrimenti
        # invia le stringhe con charset di default e corrompe i non-ASCII.
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $resp = Invoke-RestMethod -Method Post -Uri ($Config.Url + $Config.GeneratePath) `
            -ContentType 'application/json; charset=utf-8' -Body $bytes `
            -TimeoutSec $Config.TimeoutSec
        $text = Get-LlmResponseText -Response $resp -Provider $Config.Provider
        if ($text) { return $text }
        return $null
    } catch {
        return $null
    }
}

function Test-LlmService {
    # $true se il server risponde all'endpoint di health. Con -RequireModel
    # verifica anche che il modello configurato sia fra quelli disponibili.
    param(
        $Config = $null,
        [string]$ProjectDir = '',
        [int]$TimeoutSec = 5,
        [switch]$RequireModel
    )

    if ($null -eq $Config) { $Config = Get-LlmConfig -ProjectDir $ProjectDir }
    try {
        $resp = Invoke-RestMethod -Method Get -Uri ($Config.Url + $Config.HealthPath) `
            -TimeoutSec $TimeoutSec
    } catch {
        return $false
    }
    if (-not $RequireModel) { return $true }
    $ids = Get-LlmModelIds -Response $resp -Provider $Config.Provider
    return ($ids -contains $Config.Model)
}

function Get-LlmErrorDetail {
    # Messaggio leggibile da un ErrorRecord di Invoke-RestMethod/WebRequest.
    # Tollera entrambe le forme di errore: {"error":"stringa"} di Ollama e
    # {"error":{"message":...}} di OpenAI/LM Studio.
    param([Parameter(Mandatory = $true)]$ErrorRecord)

    $detail = ''
    try {
        $resp = $ErrorRecord.Exception.Response
        if ($resp) {
            $stream = $resp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $raw = $reader.ReadToEnd()
            $reader.Dispose()
            if ($raw) {
                try {
                    $parsed = $raw | ConvertFrom-Json
                    if ($parsed.error -is [string]) {
                        $detail = $parsed.error
                    } elseif ($parsed.error) {
                        $detail = [string]$parsed.error.message
                    }
                } catch {
                    $detail = $raw
                }
            }
        }
    } catch {
        $detail = ''
    }
    if (-not $detail) { $detail = $ErrorRecord.Exception.Message }
    return ([string]$detail).Trim()
}

function Get-LlmUnavailableHint {
    # Messaggio operativo quando il server locale non risponde.
    param([Parameter(Mandatory = $true)]$Config)

    if ($Config.Provider -eq 'lmstudio') {
        return ("LM Studio non raggiungibile su {0}. Avvia il server (lms server start), " +
                "poi 'lms get {1}' e 'lms load {1}' se il modello non e' caricato. " +
                "Variabili: LLM_PROVIDER, LMSTUDIO_URL, LMSTUDIO_MODEL.") -f $Config.Url, $Config.Model
    }
    return ("Ollama non raggiungibile su {0}. Avvia il servizio (app Ollama o 'ollama serve'), " +
            "poi 'ollama pull {1}' se il modello non e' installato. " +
            "Variabili: OLLAMA_URL, OLLAMA_MODEL.") -f $Config.Url, $Config.Model
}

function ConvertFrom-LlmStreamLine {
    # Interpreta una riga di stream e ritorna @{ Piece; Done; Error } oppure
    # $null se la riga va ignorata. Due formati:
    #   Ollama NDJSON: un oggetto JSON per riga, delta in .message.content
    #   OpenAI SSE:    righe "data: {...}", delta in .choices[0].delta.content,
    #                  chiusura con "data: [DONE]" oppure finish_reason non nullo
    #                  (vLLM chiude cosi', senza mandare [DONE]).
    param([string]$Line, [string]$Provider)

    $line = $Line.Trim()
    if (-not $line) { return $null }

    if ($Provider -eq 'lmstudio') {
        if (-not $line.StartsWith('data:')) { return $null }   # commenti/heartbeat SSE
        $data = $line.Substring(5).Trim()
        if ($data -eq '[DONE]') { return @{ Piece = ''; Done = $true; Error = $null } }
        try { $chunk = $data | ConvertFrom-Json } catch { return $null }
        if ($chunk.error) {
            $err = if ($chunk.error -is [string]) { [string]$chunk.error } else { [string]$chunk.error.message }
            return @{ Piece = ''; Done = $true; Error = $err }
        }
        $choice = @($chunk.choices)[0]
        $piece = if ($choice) { [string]$choice.delta.content } else { '' }
        $done = ($choice -and $null -ne $choice.finish_reason -and '' -ne [string]$choice.finish_reason)
        return @{ Piece = $piece; Done = $done; Error = $null }
    }

    try { $chunk = $line | ConvertFrom-Json } catch { return $null }
    if ($chunk.error) { return @{ Piece = ''; Done = $true; Error = [string]$chunk.error } }
    return @{ Piece = [string]$chunk.message.content; Done = [bool]$chunk.done; Error = $null }
}

function Remove-LlmCodeFence {
    # Toglie il wrapper markdown che i modelli aggiungono attorno a un file
    # intero. Gestisce anche il caso degenere di una sola riga aperta.
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text)

    $lines = @($Text -split "`r?`n")
    if ($lines.Count -gt 0 -and $lines[0].TrimStart().StartsWith('```')) {
        $lines = @($lines | Select-Object -Skip 1)
    }
    if ($lines.Count -gt 0 -and $lines[-1].Trim() -eq '```') {
        $lines = @($lines | Select-Object -First ($lines.Count - 1))
    }
    return ($lines -join "`n")
}
