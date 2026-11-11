# _io.ps1 - Helper I/O testo per gli script di ConsoleClaude (Windows-first, PS 5.1)
#
# Centralizza la scrittura di file di testo per evitare due insidie di PS 5.1:
#   - `Set-Content -Encoding UTF8` aggiunge un BOM (U+FEFF) che rompe i consumer
#     (json.loads senza utf-8-sig, bash, Test-Path su path con BOM, ecc.).
#   - Il join con "`n" su un file CRLF mischia i line ending e genera churn git.
#
# Uso (dot-source):
#   . (Join-Path $PSScriptRoot "_io.ps1")
#   Write-ProjectText -Path $f -Content $s                          # UTF-8 no-BOM, EOL invariato
#   Write-ProjectText -Path $f -Content $s -Eol (Get-DominantEol $f) # preserva l'EOL del file

function Get-DominantEol {
    # Ritorna 'crlf' se nel file prevalgono i CRLF, altrimenti 'lf'
    # ('lf' anche come default per file inesistenti o illeggibili).
    param([string]$Path)
    if (-not $Path -or -not (Test-Path $Path)) { return 'lf' }
    try { $raw = [System.IO.File]::ReadAllText($Path) } catch { return 'lf' }
    $crlf = ([regex]::Matches($raw, "`r`n")).Count
    $lf   = ([regex]::Matches($raw, "(?<!`r)`n")).Count
    if ($crlf -gt $lf) { return 'crlf' } else { return 'lf' }
}

function Read-ProjectText {
    # Legge un file di testo come UTF-8 (con rilevamento BOM), coerente con Write-ProjectText.
    # In PS 5.1 `Get-Content -Raw` senza -Encoding usa la code page ANSI di sistema: sui file
    # UTF-8 con caratteri non-ASCII produce mojibake e rende instabile il confronto src<->dst
    # (drift perpetuo). .NET ReadAllText usa UTF-8 di default e rileva un eventuale BOM.
    param([Parameter(Mandatory)][string]$Path)
    return [System.IO.File]::ReadAllText($Path)
}

function Write-ProjectText {
    # Scrive $Content in $Path come UTF-8 SENZA BOM (nessun newline finale aggiunto,
    # come `-NoNewline`). -Eol 'crlf'|'lf' normalizza i line ending; '' = invariato.
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][AllowEmptyString()][string]$Content,
        [ValidateSet('', 'crlf', 'lf')][string]$Eol = ''
    )
    if ($Eol -eq 'crlf')   { $Content = (($Content -replace "`r`n", "`n") -replace "`n", "`r`n") }
    elseif ($Eol -eq 'lf') { $Content = ($Content -replace "`r`n", "`n") }
    [System.IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding $false))
}

function ConvertTo-JsonStable {
    # Serializza in JSON con formato FISSO: 4 spazi di indentazione, LF, nessuna
    # dipendenza dalla versione di PowerShell.
    #
    # `ConvertTo-Json` non e' utilizzabile per file versionati: Windows PowerShell 5.1
    # emette `"key":  "val"` (due spazi) e array allineati a colonna, pwsh 7 emette
    # 2 spazi - cosi' lo stesso file JSON riscritto da runtime diversi produce un
    # diff di decine di righe puramente cosmetico.
    param([Parameter(Mandatory)][AllowNull()]$Value, [int]$Depth = 0)

    $pad = ' ' * (4 * $Depth)
    $padIn = ' ' * (4 * ($Depth + 1))

    if ($null -eq $Value) { return 'null' }
    if ($Value -is [bool]) { if ($Value) { return 'true' } else { return 'false' } }
    if ($Value -is [int] -or $Value -is [long] -or $Value -is [double] -or $Value -is [decimal]) {
        return [string]([System.Convert]::ToString($Value, [System.Globalization.CultureInfo]::InvariantCulture))
    }
    if ($Value -is [string]) { return (ConvertTo-Json $Value -Compress) }

    if ($Value -is [System.Collections.IDictionary] -or $Value -is [PSCustomObject]) {
        if ($Value -is [System.Collections.IDictionary]) {
            $pairs = @($Value.Keys | ForEach-Object { [PSCustomObject]@{ Name = [string]$_; Value = $Value[$_] } })
        } else {
            $pairs = @($Value.PSObject.Properties | ForEach-Object { [PSCustomObject]@{ Name = $_.Name; Value = $_.Value } })
        }
        if ($pairs.Count -eq 0) { return '{}' }
        $body = @($pairs | ForEach-Object {
            $k = ConvertTo-Json $_.Name -Compress
            "$padIn$k`: " + (ConvertTo-JsonStable -Value $_.Value -Depth ($Depth + 1))
        })
        return "{`n" + ($body -join ",`n") + "`n$pad}"
    }

    if ($Value -is [System.Collections.IEnumerable]) {
        $items = @($Value)
        if ($items.Count -eq 0) { return '[]' }
        $body = @($items | ForEach-Object { $padIn + (ConvertTo-JsonStable -Value $_ -Depth ($Depth + 1)) })
        return "[`n" + ($body -join ",`n") + "`n$pad]"
    }

    return (ConvertTo-Json ([string]$Value) -Compress)
}

function Write-JsonFile {
    # Scrive un oggetto come JSON stabile (4 spazi, LF, newline finale, UTF-8 no-BOM).
    # Da usare per OGNI file JSON versionato che gli script riscrivono.
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][AllowNull()]$Value
    )
    Write-ProjectText -Path $Path -Content ((ConvertTo-JsonStable -Value $Value) + "`n") -Eol 'lf'
}
