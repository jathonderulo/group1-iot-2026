import json
import os
import time
from typing import Any, Dict, Optional
import paho.mqtt.client as mqtt
import requests

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "desks/+/state")

# Optional: forward to EC2 later
EC2_INGEST_URL = os.getenv("EC2_INGEST_URL")
EC2_TOKEN = os.getenv("EC2_TOKEN")           


def validate_payload(topic: str, payload: Dict[str, Any]) -> Optional[str]:
    """
    Basic schema validation. Returns error string if invalid, else None.
    """
    # Extract desk_id from topic: desks/<desk_id>/state
    parts = topic.split("/")
    if len(parts) != 3 or parts[0] != "desks" or parts[2] != "state":
        return "Invalid topic format"

    desk_id = parts[1]

    # Required fields
    if "occupied" not in payload or "noise_band" not in payload:
        return "Missing required fields: occupied and/or noise_band"

    if not isinstance(payload["occupied"], bool):
        return "occupied must be boolean"

    if not isinstance(payload["noise_band"], int) or payload["noise_band"] not in (0, 1, 2):
        return "noise_band must be int in {0,1,2}"

    # ensure desk_id inside payload matches topic if present
    if "desk_id" in payload and payload["desk_id"] != desk_id:
        return "desk_id mismatch between topic and payload"

    return None


def on_connect(client, userdata, flags, reason_code, properties):
    # In V2, reason_code.is_failure can be used, or just compare to 0
    if reason_code == 0:
        print(f"[collector] Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC)
        print(f"[collector] Subscribed to topic: {MQTT_TOPIC}")
    else:
        print(f"[collector] MQTT connect failed with code={reason_code}")



def on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage):
    topic = msg.topic
    raw = msg.payload.decode("utf-8", errors="replace")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        print(f"[collector] Reject (invalid JSON) topic={topic} payload={raw}")
        return

    err = validate_payload(topic, payload)
    if err:
        print(f"[collector] Reject ({err}) topic={topic} payload={payload}")
        return

    # add timestamp if missing
    if "ts" not in payload:
        payload["ts"] = int(time.time())

    print(f"[collector] OK topic={topic} payload={payload}")

    if EC2_INGEST_URL:
        forward_to_ec2(topic, payload)


def forward_to_ec2(topic: str, payload: Dict[str, Any]) -> None:
    envelope = {
        "topic": topic,
        "payload": payload,
    }

    headers = {"Content-Type": "application/json"}
    if EC2_TOKEN:
        headers["Authorization"] = f"Bearer {EC2_TOKEN}"

    try:
        resp = requests.post(EC2_INGEST_URL, json=envelope, headers=headers, timeout=5)
        print(f"[collector] Forwarded to EC2 status={resp.status_code} url={EC2_INGEST_URL}")
    except requests.RequestException as err:
        print(f"[collector] Forward failed url={EC2_INGEST_URL} error={err}")


def main():
    client = mqtt.Client(
            client_id="collector",
            protocol=mqtt.MQTTv311,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2
    )

    client.reconnect_delay_set(min_delay=1, max_delay=30)

    # for later broker user/pass
    # client.username_pw_set(os.getenv("MQTT_USER"), os.getenv("MQTT_PASS"))

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
