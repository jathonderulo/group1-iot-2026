Write-Host "Publishing test MQTT message..."

Set-Location "$PSScriptRoot/.."

'{"desk_id":"D01","occupied":true,"noise_band":1}' |
docker compose exec -T mosquitto `
    mosquitto_pub -t desks/D01/state -l
