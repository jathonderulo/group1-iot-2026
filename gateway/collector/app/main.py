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
    Validate incoming MQTT messages for the new schema.

    Topic:   desks/<desk_id>/state   (desk_id must be an int)
    Payload: {
        "person_present": <bool>,
        "stuff_on_desk": <bool>,
        optional "desk_id": <int> (must match topic if present)
        optional "ts": <int>
    }
    """
    parts = topic.split("/")
    if len(parts) != 3 or parts[0] != "desks" or parts[2] != "state":
        return "Invalid topic format (expected desks/<desk_id>/state)"

    desk_id_str = parts[1]
    try:
        desk_id_topic = int(desk_id_str)
    except ValueError:
        return "desk_id in topic must be an integer"

    # Required fields
    missing = [k for k in ("person_present", "stuff_on_desk") if k not in payload]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"

    if not isinstance(payload["person_present"], bool):
        return "person_present must be boolean"

    if not isinstance(payload["stuff_on_desk"], bool):
        return "stuff_on_desk must be boolean"

    # Optional fields
    if "desk_id" in payload:
        if not isinstance(payload["desk_id"], int):
            return "desk_id in payload must be an integer"
        if payload["desk_id"] != desk_id_topic:
            return "desk_id mismatch between topic and payload"

    if "ts" in payload and not isinstance(payload["ts"], int):
        return "ts must be an integer unix timestamp"

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

    #err = validate_payload(topic, payload)
    # if err:
        # print(f"[collector] Reject ({err}) topic={topic} payload={payload}")
        # return

    # add timestamp if missing
    if "ts" not in payload:
        payload["ts"] = int(time.time())

    print(f"[collector] OK topic={topic} payload={payload}")

    if EC2_INGEST_URL:
        forward_to_ec2(topic, payload)


def forward_to_ec2(topic: str, payload: Dict[str, Any]) -> None:
    # desks/<desk_id>/state
    parts = topic.split("/")
    desk_id_raw = parts[1] if len(parts) == 3 else payload.get("desk_id")

    try:
        desk_id = int(desk_id_raw)
    except (TypeError, ValueError):
        print(f"[collector] Forward reject: invalid desk_id={desk_id_raw} topic={topic}")
        return

    api_payload = {
        "desk_id": desk_id,
        # Prefer API-native keys if present, otherwise map from your MQTT schema
        "person_present": bool(payload.get("person_present", payload.get("occupied", False))),
        "stuff_on_desk": bool(payload.get("stuff_on_desk", False)),
    }

    headers = {"Content-Type": "application/json"}
    if EC2_TOKEN:
        headers["Authorization"] = f"Bearer {EC2_TOKEN}"

    try:
        print("[collector] PUT", EC2_INGEST_URL, "json=", json.dumps(api_payload, separators=(",", ":")))
        resp = requests.put(EC2_INGEST_URL, json=api_payload, headers=headers, timeout=5)
        print(f"[collector] Forwarded to EC2 status={resp.status_code} url={EC2_INGEST_URL} body={resp.text[:300]}")
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
