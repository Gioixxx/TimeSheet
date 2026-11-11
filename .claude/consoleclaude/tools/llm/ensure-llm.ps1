<#
.SYNOPSIS
    Verifica che il provider LLM locale attivo sia pronto, avviandolo se serve.

.DESCRIPTION
    Punto d'ingresso unico per /session-start e per la console, che lo lancia
    all'apertura della prima sessione con il sidecar: serve un server locale
    con cui il sidecar possa parlare. Risolve il provider
    (LLM_PROVIDER > models.json .llm.provider > ollama) e delega allo script
    specifico: ensure-ollama.ps1 oppure setup-lmstudio.ps1.

    Non esiste un solo script che avvia "il provider": ensure-ollama.ps1 resta
    com'e' - uno script chiamato ensure-ollama che avvia LM Studio sarebbe una
    trappola di leggibilita'.

    Come i due script che invoca, non lancia eccezioni bloccanti: in caso di
    problemi stampa un hint e restituisce exit code != 0, e il chiamante
    prosegue senza sidecar.

.PARAMETER ProjectDir
    Progetto da cui leggere .claude/models.json. Default: cartella corrente.

.PARAMETER WaitSec
    Secondi massimi di attesa perche' il server diventi pronto (default 30).

.PARAMETER Quiet
    Riduce l'output allo stretto necessario.

.OUTPUTS
    Exit code 0 = provider pronto. Exit code 1 = non avviabile.

.EXAMPLE
    powershell -NoProfile -File .claude\consoleclaude\tools\llm\ensure-llm.ps1
#>
[CmdletBinding()]
param(
    [string]$ProjectDir = (Get-Location).Path,
    [int]$WaitSec = 30,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '_llm.ps1')

$cfg = Get-LlmConfig -ProjectDir $ProjectDir

# Splatting con hashtable, non con un array in $args: $args e' una variabile
# automatica di PowerShell e assegnarla rompe il binding dei parametri.
if ($cfg.Provider -eq 'lmstudio') {
    # -SkipLoad: qui si vuole solo un server pronto, non riconfigurare il
    # caricamento del modello a ogni inizio sessione (lms load scarica e
    # ricarica, operazione lunga). Il load con context length e TTL e' compito
    # del setup, una volta sola.
    $params = @{ ProjectDir = $ProjectDir; WaitSec = $WaitSec; SkipLoad = $true }
    if ($Quiet) { $params['Quiet'] = $true }
    & (Join-Path $PSScriptRoot 'setup-lmstudio.ps1') @params
} else {
    $params = @{ Url = $cfg.Url; WaitSec = $WaitSec }
    if ($Quiet) { $params['Quiet'] = $true }
    & (Join-Path $PSScriptRoot 'ensure-ollama.ps1') @params
}
$code = $LASTEXITCODE
if ($code -ne 0) {
    # Anche con -Quiet: e' la riga che dice dove guardare.
    # Il client Python sta nell'app, non nel progetto: la console passa il suo percorso in CONSOLECLAUDE_LLM_CLIENT.
    if ($env:CONSOLECLAUDE_LLM_CLIENT) {
        Write-Host "Diagnosi passo per passo: python `"$($env:CONSOLECLAUDE_LLM_CLIENT)`" --doctor" -ForegroundColor Yellow
    } else {
        Write-Host "Diagnosi passo per passo: il client Python dell'app (llm_client.py) ha l'opzione --doctor." -ForegroundColor Yellow
    }
}
exit $code
