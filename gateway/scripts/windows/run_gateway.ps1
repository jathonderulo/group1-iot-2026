Write-Host "Starting IoT Gateway..."

# Move to project root (script may be run from anywhere)
Set-Location "$PSScriptRoot/.."

docker compose up --build