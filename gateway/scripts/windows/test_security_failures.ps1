param(
    [ValidateSet("bad-cert", "bad-device-pass", "bad-collector-pass")]
    [string]$Case,
    [switch]$KeepRunning = $false,
    [int]$LogTail = 200
)

Write-Host "Running negative security test case: $Case"

Set-Location "$PSScriptRoot/.."
Set-Location ".."

function Read-EnvFile([string]$Path) {
    $map = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line.Split("=", 2)
        if ($parts.Count -eq 2) {
            $map[$parts[0]] = $parts[1]
        }
    }
    return $map
}

function Write-EnvFile([string]$Path, [hashtable]$Map) {
    $lines = @()
    foreach ($key in ($Map.Keys | Sort-Object)) {
        $lines += "$key=$($Map[$key])"
    }
    Set-Content -Path $Path -Value $lines -NoNewline:$false
}

docker version *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running or not reachable. Start Docker Desktop and retry."
}

$envMap = Read-EnvFile ".env.e2e"
$tempWorkDir = Join-Path $env:TEMP ("gateway-e2e-negative-{0}" -f [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempWorkDir | Out-Null
$extraComposeFiles = @()

switch ($Case) {
    "bad-cert" {
        # Deterministic TLS failure: use a trust anchor that did not sign broker.crt.
        $fakeCaKey = Join-Path $tempWorkDir "fake-ca.key"
        $fakeCaCrt = Join-Path $tempWorkDir "fake-ca.crt"
        $openssl = Get-Command openssl -ErrorAction SilentlyContinue
        if (-not $openssl) {
            throw "OpenSSL is required for bad-cert test but was not found in PATH."
        }

        $restoreNativeErrorPreference = $false
        if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
            $previousNativeErrorPreference = $PSNativeCommandUseErrorActionPreference
            $PSNativeCommandUseErrorActionPreference = $false
            $restoreNativeErrorPreference = $true
        }

        try {
            & $openssl.Source req -x509 -newkey rsa:2048 -keyout $fakeCaKey -out $fakeCaCrt -days 2 -nodes -subj "/CN=fake-ca" 1>$null 2>$null
        }
        finally {
            if ($restoreNativeErrorPreference) {
                $PSNativeCommandUseErrorActionPreference = $previousNativeErrorPreference
            }
        }

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $fakeCaCrt)) {
            throw "Failed to generate fake CA cert for bad-cert test."
        }

        $envMap["MQTT_CA_CERT"] = "/certs/fake-ca.crt"
        $fakeCaForCompose = $fakeCaCrt -replace "\\", "/"
        $overridePath = Join-Path $tempWorkDir "docker-compose.bad-cert.override.yml"
@"
services:
  mock-esp32:
    volumes:
      - ${fakeCaForCompose}:/certs/fake-ca.crt:ro
  collector:
    volumes:
      - ${fakeCaForCompose}:/certs/fake-ca.crt:ro
"@ | Set-Content -Path $overridePath
        $extraComposeFiles = @("-f", $overridePath)
    }
    "bad-device-pass" {
        $envMap["MQTT_PASS"] = "wrong_device_password"
    }
    "bad-collector-pass" {
        $envMap["MQTT_COLLECTOR_PASS"] = "wrong_collector_password"
    }
}

$tempEnvFile = Join-Path $tempWorkDir ("case-{0}.env" -f $Case)
Write-EnvFile -Path $tempEnvFile -Map $envMap
$projectName = "gatewayneg" + ([guid]::NewGuid().ToString("N").Substring(0, 12))
$composeArgs = @("-p", $projectName, "--env-file", $tempEnvFile, "-f", "docker-compose.yml", "-f", "docker-compose.e2e.yml") + $extraComposeFiles

try {
    docker compose @composeArgs down --remove-orphans
    $varsToClear = @(
        "MQTT_CA_CERT","MQTT_HOST","MQTT_PORT","MQTT_USER","MQTT_PASS",
        "MQTT_COLLECTOR_USER","MQTT_COLLECTOR_PASS","MQTT_TOPIC",
        "MOCK_DEVICE_ID","MOCK_MQTT_TOPIC","EC2_INGEST_URL","EC2_HOST","EC2_PORT","LISTEN_PORT"
    )

    foreach ($v in $varsToClear) {
        if (Test-Path "Env:\$v") { Remove-Item "Env:\$v" }
    }
    docker compose @composeArgs up -d --build

    Start-Sleep -Seconds 5

    $caseObserved = $false
    $esp32Logs = ""
    $collectorLogs = ""
    $mosquittoLogs = ""
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep -Seconds 2
        $esp32Logs = docker compose @composeArgs logs mock-esp32
        $collectorLogs = docker compose @composeArgs logs collector
        $mosquittoLogs = docker compose @composeArgs logs mosquitto

        switch ($Case) {
            "bad-cert" {
                $esp32CertFail = $esp32Logs | Select-String -Pattern "CERTIFICATE_VERIFY_FAILED|SSLCertVerificationError|certificate verify failed|unable to get local issuer certificate|self-signed certificate|unknown ca|NO_CERTIFICATE_OR_CRL_FOUND"
                $collectorCertFail = $collectorLogs | Select-String -Pattern "CERTIFICATE_VERIFY_FAILED|SSLCertVerificationError|certificate verify failed|unable to get local issuer certificate|self-signed certificate|unknown ca|NO_CERTIFICATE_OR_CRL_FOUND"
                if ($esp32CertFail -and $collectorCertFail) {
                    $caseObserved = $true
                }
            }
            "bad-device-pass" {
                $deviceRejected = $esp32Logs | Select-String -Pattern "\[mock-esp32\]\[auth\] CONNACK rejected username=desk01"
                $collectorAccepted = $collectorLogs | Select-String -Pattern "\[collector\]\[auth\] CONNACK accepted username=collector"
                $brokerRejected = $mosquittoLogs | Select-String -Pattern "u'desk01'.*not authorised|Sending CONNACK to .*\(0, 5\)"
                if ($deviceRejected -and $collectorAccepted -and $brokerRejected) {
                    $caseObserved = $true
                }
            }
            "bad-collector-pass" {
                $collectorRejected = $collectorLogs | Select-String -Pattern "\[collector\]\[auth\] CONNACK rejected username=collector"
                $deviceAccepted = $esp32Logs | Select-String -Pattern "\[mock-esp32\]\[auth\] CONNACK accepted username=desk01"
                $brokerRejected = $mosquittoLogs | Select-String -Pattern "collector.*not authorised|Sending CONNACK to collector \(0, 5\)"
                if ($collectorRejected -and $deviceAccepted -and $brokerRejected) {
                    $caseObserved = $true
                }
            }
        }

        if ($caseObserved) { break }
    }

    Write-Host ""
    Write-Host "----- mock-esp32 logs -----"
    docker compose @composeArgs logs --tail $LogTail mock-esp32
    Write-Host ""
    Write-Host "----- collector logs -----"
    docker compose @composeArgs logs --tail $LogTail collector
    Write-Host ""
    Write-Host "----- mosquitto logs -----"
    docker compose @composeArgs logs --tail $LogTail mosquitto

    if (-not $caseObserved) {
        throw "Expected failure condition for case '$Case' was not observed in logs."
    }

    Write-Host ""
    Write-Host "PASS: Negative security case '$Case' failed as expected."
}
finally {
    if (-not $KeepRunning) {
        docker compose @composeArgs down --remove-orphans
    } else {
        Write-Host "Containers kept running. Stop with:"
        Write-Host "docker compose -p $projectName --env-file `"$tempEnvFile`" -f docker-compose.yml -f docker-compose.e2e.yml down --remove-orphans"
    }

    if (Test-Path $tempWorkDir) {
        Remove-Item -Recurse -Force $tempWorkDir
    }
}
