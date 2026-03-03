param(
    [switch]$KeepRunning = $false,
    [int]$LogTail = 200
)

Write-Host "Running gateway end-to-end test (mock-esp32 -> broker -> collector -> forwarder -> mock-ec2)..."

Set-Location "$PSScriptRoot/.."
Set-Location ".."

$composeArgs = @("--env-file", ".env.e2e", "-f", "docker-compose.yml", "-f", "docker-compose.e2e.yml")

$envFile = ".env.e2e"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line.Split("=", 2)
        if ($parts.Count -eq 2) { Set-Item -Path "Env:$($parts[0])" -Value $parts[1] }
    }
}

docker version *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running or not reachable. Start Docker Desktop and retry."
}

try {
    docker compose @composeArgs down --remove-orphans
    docker compose @composeArgs up -d --build

    Start-Sleep -Seconds 5

    $deviceFlowOk = $null
    $esp32TlsOk = $null
    $collectorTlsOk = $null
    $brokerTlsOk = $null
    $brokerDeviceAuthOk = $null
    $brokerCollectorAuthOk = $null
    $collectorOk = $null
    $javaOk = $null
    $mockOk = $null
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 2
        $esp32Logs = docker compose @composeArgs logs mock-esp32
        $collectorLogs = docker compose @composeArgs logs collector
        $javaLogs = docker compose @composeArgs logs forwarder
        $mockLogs = docker compose @composeArgs logs mock-ec2
        $mosquittoLogs = docker compose @composeArgs logs mosquitto

        $deviceFlowOk = $collectorLogs | Select-String -Pattern "OK topic=desks/1/state payload=\{'device_id': 'desk01'"
        $esp32TlsOk = $esp32Logs | Select-String -Pattern "\[mock-esp32\]\[tls\] Handshake complete"
        $collectorTlsOk = $collectorLogs | Select-String -Pattern "\[collector\]\[tls\] Handshake complete"
        $brokerTlsOk = $mosquittoLogs | Select-String -Pattern "New connection from .* on port 8883"
        $brokerDeviceAuthOk = $mosquittoLogs | Select-String -Pattern "New client connected.*$($env:MQTT_USER)"
        $brokerCollectorAuthOk = $mosquittoLogs | Select-String -Pattern "New client connected.*$($env:MQTT_COLLECTOR_USER)"
        $collectorOk = $collectorLogs | Select-String -Pattern "Forwarded to EC2 status=200"
        $javaOk = $javaLogs | Select-String -Pattern "\[gateway\] <- status=200"
        $mockOk = $mockLogs | Select-String -Pattern "\[mock-ec2\] RECEIVED path=/ingest"

        if ($deviceFlowOk -and $esp32TlsOk -and $collectorTlsOk -and $brokerTlsOk -and $brokerDeviceAuthOk -and $brokerCollectorAuthOk -and $collectorOk -and $javaOk -and $mockOk) {
            break
        }
    }

    if (-not $deviceFlowOk) {
        throw "Collector did not receive expected mock-esp32 payload/topic. Check mock-esp32 and collector logs."
    }
    if (-not $esp32TlsOk) {
        throw "Mock ESP32 TLS handshake log not found."
    }
    if (-not $collectorTlsOk) {
        throw "Collector TLS handshake log not found."
    }
    if (-not $brokerTlsOk) {
        throw "Mosquitto TLS listener log on port 8883 not found."
    }
    if (-not $brokerDeviceAuthOk) {
        throw "Mosquitto device username auth log not found."
    }
    if (-not $brokerCollectorAuthOk) {
        throw "Mosquitto collector username auth log not found."
    }
    if (-not $collectorOk) {
        throw "Collector did not forward successfully. Check collector service logs."
    }
    if (-not $javaOk) {
        throw "Forwarder did not proxy request. Check forwarder service logs."
    }
    if (-not $mockOk) {
        throw "Mock EC2 did not receive ingest request. Check mock-ec2 logs."
    }

    Write-Host ""
    Write-Host "----- mock-esp32 service logs -----"
    docker compose @composeArgs logs --tail $LogTail mock-esp32
    Write-Host ""
    Write-Host "----- collector service logs -----"
    docker compose @composeArgs logs --tail $LogTail collector
    Write-Host ""
    Write-Host "----- forwarder service logs -----"
    docker compose @composeArgs logs --tail $LogTail forwarder
    Write-Host ""
    Write-Host "----- mock-ec2 logs -----"
    docker compose @composeArgs logs --tail $LogTail mock-ec2
    Write-Host ""
    Write-Host "----- mosquitto logs -----"
    docker compose @composeArgs logs --tail $LogTail mosquitto
    Write-Host ""
    Write-Host "PASS: End-to-end message flow verified."
}
catch {
    Write-Host ""
    Write-Host "----- mock-esp32 service logs -----"
    docker compose @composeArgs logs --tail $LogTail mock-esp32
    Write-Host ""
    Write-Host "----- collector service logs -----"
    docker compose @composeArgs logs --tail $LogTail collector
    Write-Host ""
    Write-Host "----- forwarder service logs -----"
    docker compose @composeArgs logs --tail $LogTail forwarder
    Write-Host ""
    Write-Host "----- mock-ec2 logs -----"
    docker compose @composeArgs logs --tail $LogTail mock-ec2
    Write-Host ""
    Write-Host "----- mosquitto logs -----"
    docker compose @composeArgs logs --tail $LogTail mosquitto
    throw
}
finally {
    if (-not $KeepRunning) {
        docker compose @composeArgs down --remove-orphans
    } else {
        Write-Host "Containers kept running. Stop with:"
        Write-Host "docker compose -f docker-compose.yml -f docker-compose.e2e.yml down --remove-orphans"
    }
}
