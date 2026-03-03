param(
    [switch]$KeepRunning = $false,
    [int]$LogTail = 200
)

& "$PSScriptRoot/test_security_failures.ps1" -Case "bad-collector-pass" -KeepRunning:$KeepRunning -LogTail $LogTail
