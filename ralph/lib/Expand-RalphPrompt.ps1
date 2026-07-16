# Expand-RalphPrompt.ps1 — espande riferimenti @path per runner Cursor (non Claude Code).

function Resolve-RalphRefPath {
    param(
        [string]$Ref,
        [string]$ProjectDir,
        [string]$ClaudeLibsPath = ''
    )

    $ref = $Ref.Trim()
    if ($ref -notmatch '^@(.+)$') { return $null }
    $pathPart = $Matches[1].Trim()

    # Path assoluto (es. @C:\claude-libs/stacks/dotnet.md)
    if ([System.IO.Path]::IsPathRooted($pathPart)) {
        return $pathPart
    }

    # @ralph/... → relativo alla cartella ralph del progetto
    if ($pathPart -match '^ralph/(.+)$') {
        $ralphDir = Join-Path $ProjectDir 'ralph'
        if (-not (Test-Path $ralphDir)) {
            $ralphDir = Join-Path $ProjectDir '.claude\ralph'
        }
        return Join-Path $ralphDir $Matches[1]
    }

    # @CLAUDE.md → root progetto
    if ($pathPart -eq 'CLAUDE.md') {
        $p = Join-Path $ProjectDir 'CLAUDE.md'
        if (Test-Path $p) { return $p }
        return Join-Path $ProjectDir '.claude\CLAUDE.md'
    }

    # @.claude/... o path relativo generico
    return Join-Path $ProjectDir ($pathPart -replace '/', '\')
}

function Expand-RalphPrompt {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,

        [Parameter(Mandatory = $true)]
        [string]$ProjectDir,

        [string]$ClaudeLibsPath = ''
    )

    $lines = $Prompt -split "`r?`n"
    $out = New-Object System.Collections.Generic.List[string]

    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed -match '^@(.+)$' -and $trimmed -notmatch '^@``') {
            $resolved = Resolve-RalphRefPath -Ref $trimmed -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath
            if ($resolved -and (Test-Path $resolved -PathType Leaf)) {
                $displayPath = $trimmed.Substring(1)
                $content = Get-Content -Path $resolved -Raw -Encoding utf8
                $out.Add("--- FILE: $displayPath ---")
                $out.Add($content)
                $out.Add("--- END FILE ---")
            } else {
                if ($resolved) {
                    [Console]::Error.WriteLine("AVVISO Expand-RalphPrompt: file non trovato: $resolved (ref: $trimmed)")
                }
                $out.Add($line)
            }
        } else {
            $out.Add($line)
        }
    }

    return ($out -join "`n")
}
