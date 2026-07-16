# Invoke-RalphRunner.ps1 — invoca Claude Code CLI o agente Cursor via cursor_run.py

. (Join-Path $PSScriptRoot 'Expand-RalphPrompt.ps1')
. (Join-Path $PSScriptRoot 'Resolve-ModelsConfig.ps1')
# Ollama locale per i pre/post step (opzionale: progetti con lib/ non ancora
# sincronizzata degradano — ralph.ps1 verifica la presenza delle funzioni).
$ollamaLib = Join-Path $PSScriptRoot 'Invoke-OllamaGenerate.ps1'
if (Test-Path $ollamaLib) { . $ollamaLib }

function Format-ClaudeStreamLine {
    # Renderizza un evento --output-format stream-json in una o più righe compatte.
    # Ritorna un array di stringhe (eventualmente vuoto). Null-safe sui campi mancanti.
    param(
        [Parameter(Mandatory = $true)] $Event,
        [Parameter(Mandatory = $true)] [datetime]$Start
    )

    $elapsed = (New-TimeSpan -Start $Start -End (Get-Date)).ToString('mm\:ss')
    $prefix  = "[$elapsed] "
    $lines   = @()

    switch ($Event.type) {
        'system' {
            if ($Event.subtype -eq 'init') {
                $model = if ($Event.model) { $Event.model } else { 'claude' }
                $cwd   = if ($Event.cwd) { Split-Path -Leaf $Event.cwd } else { '' }
                $tail  = if ($cwd) { " · $cwd" } else { '' }
                $lines += "$prefix▶ sessione avviata · $model$tail"
            }
        }
        'assistant' {
            foreach ($item in @($Event.message.content)) {
                if ($null -eq $item) { continue }
                if ($item.type -eq 'text') {
                    $txt = ([string]$item.text).Trim() -replace '\s+', ' '
                    if ($txt) {
                        if ($txt.Length -gt 80) { $txt = $txt.Substring(0, 80) + '…' }
                        $lines += "$prefix💬 $txt"
                    }
                } elseif ($item.type -eq 'tool_use') {
                    $in  = $item.input
                    $arg = ''
                    switch ($item.name) {
                        { $_ -in 'Read', 'Write', 'Edit', 'NotebookEdit' } {
                            if ($in.file_path) { $arg = Split-Path -Leaf $in.file_path }
                        }
                        'Bash' {
                            if ($in.command) {
                                $arg = ([string]$in.command) -replace '\s+', ' '
                                if ($arg.Length -gt 60) { $arg = $arg.Substring(0, 60) + '…' }
                            }
                        }
                        { $_ -in 'Grep', 'Glob' } { if ($in.pattern) { $arg = [string]$in.pattern } }
                        'Task' { if ($in.description) { $arg = [string]$in.description } }
                        default { if ($in.description) { $arg = [string]$in.description } }
                    }
                    $lines += "$prefix🔧 $($item.name)  $arg".TrimEnd()
                }
            }
        }
        'user' {
            foreach ($item in @($Event.message.content)) {
                if ($item.type -eq 'tool_result' -and $item.is_error) {
                    $lines += "$prefix✗ tool error"
                }
            }
        }
        'result' {
            $turns = if ($null -ne $Event.num_turns) { "$($Event.num_turns) turni" } else { $null }
            $dur   = if ($null -ne $Event.duration_ms) {
                (New-TimeSpan -Seconds ([math]::Round($Event.duration_ms / 1000))).ToString('mm\:ss')
            } else { $null }
            $cost  = if ($null -ne $Event.total_cost_usd) { ('${0:N2}' -f [double]$Event.total_cost_usd) } else { $null }
            $parts = @($turns, $dur, $cost) | Where-Object { $_ }
            $tail  = if ($parts.Count -gt 0) { ' · ' + ($parts -join ' · ') } else { '' }
            $lines += "$prefix✅ fatto$tail"
        }
    }

    return $lines
}

function Resolve-ClaudeLibsRoot {
    param([string]$ClaudeLibsPath = '')

    if ($ClaudeLibsPath -ne '' -and (Test-Path $ClaudeLibsPath)) {
        return $ClaudeLibsPath
    }
    if ($env:CLAUDE_LIBS_PATH -and (Test-Path $env:CLAUDE_LIBS_PATH)) {
        return $env:CLAUDE_LIBS_PATH
    }
    $pathFile = Join-Path $env:USERPROFILE '.claude_libs_path'
    if (Test-Path $pathFile) {
        $p = (Get-Content $pathFile -Raw).Trim()
        if ($p -and (Test-Path $p)) { return $p }
    }
    return $null
}

function Get-ClaudeUserConfig {
    $configPath = Join-Path $env:USERPROFILE '.claude.json'
    if (-not (Test-Path $configPath)) { return $null }

    $raw = Get-Content $configPath -Raw
    try {
        return $raw | ConvertFrom-Json
    } catch {
        # ~/.claude.json può contenere chiavi progetto duplicate (es. C:/ vs c:/) che
        # fanno fallire ConvertFrom-Json in PowerShell; estraiamo i campi usati da Ralph.
        Write-Warning "Parse JSON ~/.claude.json fallito ($($_.Exception.Message)); uso lettura parziale."
        $partial = [ordered]@{}
        if ($raw -match '"bypassPermissionsModeAccepted"\s*:\s*true') {
            $partial.bypassPermissionsModeAccepted = $true
        }
        $partial.projects = [pscustomobject]@{}
        return [pscustomobject]$partial
    }
}

function Get-ClaudeRalphPermissionArgs {
    param([string]$ProjectDir = '')

    # In `-p`, --dangerously-skip-permissions senza bypassPermissionsModeAccepted in
    # ~/.claude.json viene ignorato: la sessione resta in default/dontAsk e ogni Write/Edit
    # viene auto-negato. Con bypass accettato usiamo bypassPermissions; altrimenti
    # acceptEdits (auto-approva edit nel cwd) + regole allow in .claude/settings*.json per git/pytest.
    $config = Get-ClaudeUserConfig
    $bypassAccepted = $config -and [bool]$config.bypassPermissionsModeAccepted

    if ($bypassAccepted) {
        return @('--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions')
    }

    Write-Warning (
        'bypassPermissions non accettato su questa macchina: Ralph userà --permission-mode acceptEdits. ' +
        'Assicurati che .claude/settings.local.json contenga allow per git e pytest. ' +
        "Per il bypass completo esegui una volta, in interattivo: claude --dangerously-skip-permissions (accetta il warning)."
    )

    if ($ProjectDir) {
        $projectKey = ($ProjectDir -replace '\\', '/').TrimEnd('/')
        $entry = $null
        if ($config -and $config.projects) {
            $entry = $config.projects.PSObject.Properties[$projectKey]
        }
        if ($null -eq $entry -or -not $entry.Value.hasTrustDialogAccepted) {
            Write-Warning "Il progetto $ProjectDir non risulta ancora 'trusted' da Claude Code: apri una sessione interattiva nella cartella e accetta il trust dialog se le scritture falliscono."
        }
    }

    return @('--permission-mode', 'acceptEdits')
}

function Read-CursorApiKeyFromFile([string]$path) {
    if (-not (Test-Path $path)) { return $null }
    $raw = (Get-Content $path -Raw).Trim()
    if (-not $raw) { return $null }
    if ($raw -match '^\s*CURSOR_API_KEY\s*=\s*(.+)\s*$') { return $Matches[1].Trim().Trim('"').Trim("'") }
    return $raw
}

function Initialize-CursorApiKey {
    param([string]$ProjectDir = '')

    if ($env:CURSOR_API_KEY) { return $env:CURSOR_API_KEY }

    $candidates = @()
    if ($ProjectDir) {
        $candidates += (Join-Path $ProjectDir '.claude\cursor.env')
        $candidates += (Join-Path $ProjectDir '.env')
    }
    $candidates += (Join-Path $env:USERPROFILE '.cursor\cursor_api_key')
    $candidates += (Join-Path $env:USERPROFILE '.cursor\ralph.env')

    foreach ($path in $candidates) {
        $key = Read-CursorApiKeyFromFile $path
        if ($key) {
            $env:CURSOR_API_KEY = $key
            return $key
        }
    }
    return $null
}

function Test-Python312Plus {
    param([Parameter(Mandatory = $true)][string]$Exe)

    if (-not (Test-Path $Exe)) { return $false }

    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $versionLine = & $Exe --version 2>&1 | Select-Object -First 1
        if ($versionLine -match 'Python (\d+)\.(\d+)') {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            return ($major -gt 3 -or ($major -eq 3 -and $minor -ge 12))
        }
        return $false
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Find-Python312Executable {
    if ($env:RALPH_PYTHON -and (Test-Python312Plus -Exe $env:RALPH_PYTHON)) {
        return $env:RALPH_PYTHON
    }

    $candidates = @()

    foreach ($root in @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Python')
        'C:\Program Files'
    )) {
        if (-not (Test-Path $root)) { continue }
        $candidates += Get-ChildItem -Path $root -Filter 'python.exe' -Recurse -Depth 2 -ErrorAction SilentlyContinue |
            ForEach-Object { $_.FullName }
    }

    foreach ($path in @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe')
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe')
        'C:\Program Files\Python313\python.exe'
        'C:\Program Files\Python312\python.exe'
    )) {
        if ($path) { $candidates += $path }
    }

    foreach ($exe in ($candidates | Select-Object -Unique)) {
        if (Test-Python312Plus -Exe $exe) { return $exe }
    }

    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        try {
            foreach ($ver in @('3.13', '3.12')) {
                $out = & $pyLauncher.Source "-$ver" -c "import sys; print(sys.executable)" 2>$null
                if ($LASTEXITCODE -eq 0 -and $out) {
                    $exe = ([string]$out).Trim()
                    if (Test-Python312Plus -Exe $exe) { return $exe }
                }
            }
        } finally {
            $ErrorActionPreference = $prevEap
        }
    }

    foreach ($name in @('python3.12', 'python312', 'python3', 'python')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd -and (Test-Python312Plus -Exe $cmd.Source)) {
            return $cmd.Source
        }
    }

    return $null
}

function Test-CursorRunnerPrereqs {
    param(
        [string]$ClaudeLibsPath = '',
        [string]$ProjectDir = ''
    )

    $errors = @()

    [void](Initialize-CursorApiKey -ProjectDir $ProjectDir)

    if (-not $env:CURSOR_API_KEY) {
        $errors += @(
            'CURSOR_API_KEY non impostata (richiesta per runner cursor).',
            'Imposta $env:CURSOR_API_KEY, oppure salva la key in uno di:',
            '  %USERPROFILE%\.cursor\cursor_api_key',
            '  <progetto>\.claude\cursor.env',
            '  <progetto>\.env (riga CURSOR_API_KEY=...)'
        ) -join ' '
    }

    $pythonExe = Find-Python312Executable

    if (-not $pythonExe) {
        $errors += 'cursor-sdk richiede Python 3.12+ (installa Python 3.12 o usa -Runner claude).'
    }

    $libsRoot = Resolve-ClaudeLibsRoot -ClaudeLibsPath $ClaudeLibsPath
    $scriptPath = if ($libsRoot) { Join-Path $libsRoot 'scripts\ralph\cursor_run.py' } else { $null }
    if (-not $scriptPath -or -not (Test-Path $scriptPath)) {
        $errors += "scripts/cursor_run.py non trovato (imposta CLAUDE_LIBS_PATH o -ClaudeLibsPath)."
    }

    if ($errors.Count -gt 0) {
        throw ($errors -join ' ')
    }

    return @{
        Python     = $pythonExe
        ScriptPath = $scriptPath
        LibsRoot   = $libsRoot
    }
}

function Invoke-RalphRunner {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,

        [Parameter(Mandatory = $true)]
        [string]$ProjectDir,

        [ValidateSet('claude', 'cursor')]
        [string]$Runner = 'claude',

        [string]$ClaudeLibsPath = '',
        [string]$CursorModel = '',
        [switch]$CaptureOutput,
        [switch]$RalphVerbose,
        [switch]$EmitResultToStdout
    )

    $runnerLabel = if ($Runner -eq 'cursor') { 'Cursor' } else { 'Claude' }

    if ($Runner -eq 'cursor') {
        [void](Initialize-CursorApiKey -ProjectDir $ProjectDir)
        $prereqs = Test-CursorRunnerPrereqs -ClaudeLibsPath $ClaudeLibsPath -ProjectDir $ProjectDir
        $expanded = Expand-RalphPrompt -Prompt $Prompt -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath
        $tmpPrompt = [System.IO.Path]::GetTempFileName()
        try {
            Set-Content -Path $tmpPrompt -Value $expanded -Encoding utf8

            $model = $CursorModel
            if ($model -eq '' -and $env:RALPH_CURSOR_MODEL) { $model = $env:RALPH_CURSOR_MODEL }
            if ($model -eq '') { $model = 'composer-2.5' }

            $pyArgs = @(
                $prereqs.ScriptPath,
                '--cwd', $ProjectDir,
                '--prompt-file', $tmpPrompt,
                '--model', $model
            )
            if ($RalphVerbose) { $pyArgs += '--verbose' }

            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $prereqs.Python
            $psi.Arguments = ($pyArgs | ForEach-Object {
                if ($_ -match '\s') { "`"$_`"" } else { $_ }
            }) -join ' '
            $psi.WorkingDirectory = $ProjectDir
            $psi.UseShellExecute = $false
            if ($env:CURSOR_API_KEY) {
                $psi.EnvironmentVariables['CURSOR_API_KEY'] = $env:CURSOR_API_KEY
            }
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.CreateNoWindow = $true

            $proc = [System.Diagnostics.Process]::Start($psi)
            $stdout = $proc.StandardOutput.ReadToEnd()
            $stderr = $proc.StandardError.ReadToEnd()
            $proc.WaitForExit()

            if ($stderr) {
                foreach ($line in ($stderr -split "`r?`n")) {
                    if ($line) { [Console]::Error.WriteLine($line) }
                }
            }

            if ($CaptureOutput) {
                return $stdout.Trim()
            }

            if ($stdout) {
                Write-Output $stdout
            }

            if ($proc.ExitCode -ne 0) {
                throw "cursor_run.py exit $($proc.ExitCode)"
            }
        } finally {
            Remove-Item $tmpPrompt -Force -ErrorAction SilentlyContinue
        }
        return
    }

    # Branch Claude Code (comportamento originale)
    $permissionArgs = Get-ClaudeRalphPermissionArgs -ProjectDir $ProjectDir
    Push-Location $ProjectDir
    try {
        $savedNodeOptions = $env:NODE_OPTIONS
        $env:NODE_OPTIONS = ''

        # Modello Claude: RALPH_CLAUDE_MODEL > models.json (progetto > libreria).
        # Senza valore niente --model: si usa il modello di sessione dei settings.
        $claudeModel = if ($env:RALPH_CLAUDE_MODEL) { $env:RALPH_CLAUDE_MODEL } else {
            (Get-ModelsConfig -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath).ClaudeModel
        }

        $claudeArgs = @('-p', $Prompt) + $permissionArgs
        if ($claudeModel) { $claudeArgs += @('--model', $claudeModel) }
        if ($RalphVerbose -or $CaptureOutput) { $claudeArgs += '--verbose' }

        # Feed attività live: --output-format stream-json emette eventi in tempo reale.
        # Le righe renderizzate vanno su stderr (bypassano il buffering di PowerShell).
        # Vale sia per la cattura (pre/post brief) sia per le iterazioni verbose.
        $useFeed = ($RalphVerbose -or $CaptureOutput) -and -not $env:RALPH_NO_PROGRESS

        if ($useFeed) {
            $streamArgs  = $claudeArgs + @('--output-format', 'stream-json')
            $start       = Get-Date
            $finalResult = $null
            & claude @streamArgs 2>&1 | ForEach-Object {
                $raw = if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { [string]$_ }
                if (-not $raw) { return }
                $ev = $null
                try { $ev = $raw | ConvertFrom-Json } catch { }
                if ($null -eq $ev -or -not $ev.type) {
                    [Console]::Error.WriteLine($raw)
                    return
                }
                foreach ($line in (Format-ClaudeStreamLine -Event $ev -Start $start)) {
                    if ($line) { [Console]::Error.WriteLine($line) }
                }
                if ($ev.type -eq 'result' -and $ev.result) { $finalResult = [string]$ev.result }
            }
            # CaptureOutput → ritorna il testo finale; altrimenti su stdout solo se richiesto.
            if ($CaptureOutput) { return $finalResult }
            if ($EmitResultToStdout -and $finalResult) { Write-Output $finalResult }
        }
        elseif ($CaptureOutput) {
            # Fallback (RALPH_NO_PROGRESS): cattura text format, eco righe su stderr.
            $output = & claude @claudeArgs 2>&1
            foreach ($line in $output) {
                if ($line -is [System.Management.Automation.ErrorRecord]) {
                    [Console]::Error.WriteLine($line.ToString())
                } else {
                    [Console]::Error.WriteLine($line)
                }
            }
            return ($output | Where-Object { $_ -is [string] }) -join "`n"
        }
        elseif ($RalphVerbose) {
            # Fallback (RALPH_NO_PROGRESS): vecchio path verbose-text su stderr.
            & claude @claudeArgs 2>&1 | ForEach-Object {
                if ($_ -is [System.Management.Automation.ErrorRecord]) {
                    [Console]::Error.WriteLine($_.ToString())
                } else {
                    [Console]::Error.WriteLine($_)
                }
            }
        }
        else {
            & claude @claudeArgs
        }
    } finally {
        $env:NODE_OPTIONS = $savedNodeOptions
        Pop-Location
    }
}

function Import-RalphRunnerLib {
    param([string]$RalphScriptRoot, [string]$ClaudeLibsPath = '')

    $localLib = Join-Path $RalphScriptRoot 'lib\Invoke-RalphRunner.ps1'
    if (Test-Path $localLib) {
        . $localLib
        return
    }

    $libsRoot = Resolve-ClaudeLibsRoot -ClaudeLibsPath $ClaudeLibsPath
    if ($libsRoot) {
        $canonicalLib = Join-Path $libsRoot 'ralph\lib\Invoke-RalphRunner.ps1'
        if (Test-Path $canonicalLib) {
            . $canonicalLib
            return
        }
    }

    throw "Invoke-RalphRunner.ps1 non trovato in $localLib né nel clone claude-libs."
}
