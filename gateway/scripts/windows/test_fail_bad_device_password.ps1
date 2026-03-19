param(
    [switch]$KeepRunning = $false,
    [int]$LogTail = 200
)

& "$PSScriptRoot/test_security_failures.ps1" -Case "bad-device-pass" -KeepRunning:$KeepRunning -LogTail $LogTail
