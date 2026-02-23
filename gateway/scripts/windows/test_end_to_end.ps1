param(
    [switch]$KeepRunning = $false,
    [int]$LogTail = 200
)

Write-Host "Running gateway end-to-end test (broker -> collector -> forwarder -> mock-ec2)..."

Set-Location "$PSScriptRoot/.."
Set-Location ".."

$composeArgs = @("--env-file", ".env.e2e", "-f", "docker-compose.yml", "-f", "docker-compose.e2e.yml")

docker version *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running or not reachable. Start Docker Desktop and retry."
}

try {
    docker compose @composeArgs down --remove-orphans
    docker compose @composeArgs up -d --build

    Start-Sleep -Seconds 5

    '{"desk_id":"D01","occupied":true,"noise_band":1}' |
    docker compose @composeArgs exec -T mosquitto mosquitto_pub -t desks/D01/state -l

    $collectorOk = $null
    $javaOk = $null
    $mockOk = $null
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 2
        $collectorLogs = docker compose @composeArgs logs collector
        $javaLogs = docker compose @composeArgs logs forwarder
        $mockLogs = docker compose @composeArgs logs mock-ec2

        $collectorOk = $collectorLogs | Select-String -Pattern "Forwarded to EC2 status=200"
        $javaOk = $javaLogs | Select-String -Pattern "Response forwarded to client"
        $mockOk = $mockLogs | Select-String -Pattern "\[mock-ec2\] RECEIVED path=/ingest"

        if ($collectorOk -and $javaOk -and $mockOk) {
            break
        }
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
    Write-Host "----- collector service logs -----"
    docker compose @composeArgs logs --tail $LogTail collector
    Write-Host ""
    Write-Host "----- forwarder service logs -----"
    docker compose @composeArgs logs --tail $LogTail forwarder
    Write-Host ""
    Write-Host "----- mock-ec2 logs -----"
    docker compose @composeArgs logs --tail $LogTail mock-ec2
    Write-Host ""
    Write-Host "PASS: End-to-end message flow verified."
}
catch {
    Write-Host ""
    Write-Host "----- collector service logs -----"
    docker compose @composeArgs logs --tail $LogTail collector
    Write-Host ""
    Write-Host "----- forwarder service logs -----"
    docker compose @composeArgs logs --tail $LogTail forwarder
    Write-Host ""
    Write-Host "----- mock-ec2 logs -----"
    docker compose @composeArgs logs --tail $LogTail mock-ec2
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
