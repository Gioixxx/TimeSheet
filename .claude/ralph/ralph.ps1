# Ralph - Loop autonomo di sviluppo
# Uso: .\ralph.ps1 -Iterations 10 [-ProjectDir "C:\path\al\progetto"] [-Json]
#
# -Json   Emette eventi NDJSON su stdout per iterazione; log umani su stderr.
#         Ogni riga stdout è un oggetto JSON (newline-delimited). Schema: docs/script-outputs.md
# Prerequisiti: vedi ralph-once.ps1

param(
    [Parameter(Mandatory = $true)]
    [int]$Iterations,

    [string]$ProjectDir = "",
    [string]$ClaudeLibsPath = "",
    [switch]$Json,
    [switch]$Step
)

$ErrorActionPreference = "Stop"

function Resolve-DefaultProjectDir {
    param([string]$RalphScriptRoot)
    $parent = Split-Path -Parent $RalphScriptRoot
    if ((Split-Path -Leaf $parent) -eq '.claude') {
        return (Split-Path -Parent $parent)
    }
    return $parent
}

# Determina la root del progetto (repository), non la cartella .claude
if ($ProjectDir -eq "") {
    $ProjectDir = Resolve-DefaultProjectDir -RalphScriptRoot $PSScriptRoot
}
$RalphDir = $PSScriptRoot

# ── Helper log (stderr in Json mode) ─────────────────────────────────────────
function Log([string]$msg, [string]$color = "White") {
    if ($Json) {
        [Console]::Error.WriteLine($msg)
    } else {
        Write-Host $msg -ForegroundColor $color
    }
}

Log "Ralph - Loop Autonomo" "Cyan"
Log "Progetto:   $ProjectDir" "Gray"
Log "Iterazioni: $Iterations" "Gray"
Log "==========================================" "Cyan"

$ralphOncePath = Join-Path $RalphDir "ralph-once.ps1"

for ($i = 1; $i -le $Iterations; $i++) {
    # Controlla stop.signal all'inizio di ogni iterazione — consumato e rimosso
    $stopSignal = Join-Path $RalphDir "stop.signal"
    if (Test-Path $stopSignal) {
        Remove-Item $stopSignal
        if ($Json) {
            [ordered]@{ event = "stopped"; iteration = $i; reason = "stop.signal" } |
                ConvertTo-Json -Compress | Write-Output
        } else {
            Write-Host "`n🛑 Stop signal ricevuto — fermato prima dell'iterazione $i." -ForegroundColor Yellow
            Write-Host "   Iterazioni completate: $($i - 1) di $Iterations" -ForegroundColor Gray
        }
        exit 0
    }

    Log "`nIterazione $i di $Iterations" "Yellow"
    Log "--------------------------------" "Yellow"

    if ($Json) {
        # Chiama ralph-once con -Json: suo JSON su stdout (catturato), suo human su stderr (fluisce)
        if ($Step) {
            $iterJson = & $ralphOncePath -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath -Json -Step
        } else {
            $iterJson = & $ralphOncePath -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath -Json
        }

        # Emetti evento iterazione (NDJSON — una riga per evento)
        try {
            $iterResult = $iterJson | ConvertFrom-Json
            [ordered]@{
                event         = "iteration"
                iteration     = $i
                maxIterations = $Iterations
                result        = $iterResult
            } | ConvertTo-Json -Compress -Depth 10 | Write-Output

            if ($iterResult.prdComplete) {
                [ordered]@{ event = "complete"; iterations = $i } |
                    ConvertTo-Json -Compress | Write-Output
                exit 0
            }
        } catch {
            # Se ralph-once non ha emesso JSON valido, emettiamo un evento di errore
            [ordered]@{ event = "iteration"; iteration = $i; maxIterations = $Iterations;
                        result = @{ success = $false; prdComplete = $false; error = "output non parsabile" }
                      } | ConvertTo-Json -Compress -Depth 10 | Write-Output
        }
    } else {
        # Comportamento invariato senza -Json
        if ($Step) {
            $result = & $ralphOncePath -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath -Step 2>&1 | Out-String
        } else {
            $result = & $ralphOncePath -ProjectDir $ProjectDir -ClaudeLibsPath $ClaudeLibsPath 2>&1 | Out-String
        }
        Write-Host $result

        if ($result -match "<promise>COMPLETE</promise>") {
            Write-Host "`n✅ PRD COMPLETATO dopo $i iterazioni!" -ForegroundColor Green

            try {
                [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
                [System.Windows.Forms.MessageBox]::Show(
                    "Ralph ha completato il PRD dopo $i iterazioni!",
                    "Ralph - Completato", 'OK', 'Information'
                ) | Out-Null
            } catch { }

            exit 0
        }
    }
}

if ($Json) {
    [ordered]@{ event = "loop_end"; iterations = $Iterations; completed = $false } |
        ConvertTo-Json -Compress | Write-Output
} else {
    Write-Host "`n⚠️  Completate $Iterations iterazioni. Il PRD potrebbe non essere ancora finito." -ForegroundColor Yellow
    Write-Host "   Controlla ralph/prd.json per lo stato delle storie e riavvia se necessario." -ForegroundColor Gray
}
