Write-Host "Starting IoT Gateway..."

# Compose file lives two folders up from scripts
$composeFile = Join-Path $PSScriptRoot "..\..\docker-compose.yml"

docker compose -f $composeFile up --build