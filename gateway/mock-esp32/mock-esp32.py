import os
import ssl
import json
import time
import random
import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "gateway-mqtt")
MQTT_PORT = int(os.getenv("MQTT_PORT", "8883"))

DEVICE_ID = os.getenv("DEVICE_ID", "desk01")
MQTT_USER = os.getenv("MQTT_USER", DEVICE_ID)
MQTT_PASS = os.getenv("MQTT_PASS",)

TOPIC = os.getenv("MQTT_TOPIC", "desks/1/state")
QOS = int(os.getenv("MQTT_QOS", "0")) # send at most once, no ack required

CA_CERT = os.getenv("MQTT_CA_CERT", "/certs/ca.crt")

# Sim behavior:
# - "CHANGE_EVERY_SEC" controls how often the sensor might toggle.
# - "CHANGE_PROB" is probability of toggling at each interval.
CHANGE_EVERY_SEC = float(os.getenv("CHANGE_EVERY_SEC", "2.0"))
CHANGE_PROB = float(os.getenv("CHANGE_PROB", "0.35"))


PUBLISH_MODE = os.getenv("PUBLISH_MODE", "on_change")  # on_change|periodic
PERIODIC_MS = int(os.getenv("PERIODIC_MS", "5000"))

def _extract_common_name(cert: dict) -> str:
    for rdn in cert.get("subject", []):
        for key, value in rdn:
            if key == "commonName":
                return value
    return "unknown"

def _extract_san(cert: dict) -> str:
    sans = cert.get("subjectAltName", [])
    if not sans:
        return "none"
    return ",".join(f"{name_type}:{name_value}" for name_type, name_value in sans)

def log_tls_handshake(client: mqtt.Client):
    sock = client.socket()
    if sock is None:
        print("[mock-esp32][tls] Handshake details unavailable (no active socket)")
        return

    tls_version = "unknown"
    cipher_name = "unknown"
    peer_cn = "unknown"
    peer_san = "none"

    if hasattr(sock, "version"):
        try:
            tls_version = sock.version() or "unknown"
        except ssl.SSLError:
            pass

    if hasattr(sock, "cipher"):
        try:
            cipher = sock.cipher()
            if cipher:
                cipher_name = f"{cipher[0]}/{cipher[1]}"
        except ssl.SSLError:
            pass

    if hasattr(sock, "getpeercert"):
        try:
            cert = sock.getpeercert() or {}
            peer_cn = _extract_common_name(cert)
            peer_san = _extract_san(cert)
        except ssl.SSLError:
            pass

    print(
        f"[mock-esp32][tls] Handshake complete version={tls_version} cipher={cipher_name} "
        f"peer_cn={peer_cn} peer_san={peer_san}"
    )

def now_ts() -> int:
    return int(time.time())

def make_payload(occupied: bool) -> str:
    payload = {"device_id": DEVICE_ID, "person_present": occupied, "stuff_on_desk": False, "ts": now_ts()}
    return json.dumps(payload, separators=(",", ":"))

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[mock-esp32][auth] CONNACK accepted username={MQTT_USER}")
        log_tls_handshake(client)
        print(f"[mock-esp32] Connected: host={MQTT_HOST} port={MQTT_PORT} topic={TOPIC} qos={QOS}")
    else:
        print(f"[mock-esp32][auth] CONNACK rejected username={MQTT_USER} rc={reason_code}")
        print(f"[mock-esp32] Connect failed rc={reason_code}")

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
    print(f"[mock-esp32] Disconnected rc={reason_code}")

def publish(client, occupied: bool):
    msg = make_payload(occupied)
    # "LED" behavior from firmware: red when occupied, green when free
    led = "RED" if occupied else "GREEN"
    print(f"[mock-esp32] occupied={occupied} LED={led} publish {TOPIC} -> {msg}")
    client.publish(TOPIC, msg, qos=QOS, retain=False)

def main():
    # Start in an unoccupied state, like a pull-up input might read.
    occupied = False
    last_published = None

    client = mqtt.Client(
        client_id=f"mock-{DEVICE_ID}-{random.randint(1000,9999)}",
        protocol=mqtt.MQTTv311,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )
    client.username_pw_set(MQTT_USER, MQTT_PASS)

    # TLS setup: server-authenticated TLS + username/password auth
    client.tls_set(
        ca_certs=CA_CERT,
        certfile=None,
        keyfile=None,
        tls_version=ssl.PROTOCOL_TLS_CLIENT,
    )

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.reconnect_delay_set(min_delay=1, max_delay=30)

    print(f"[mock-esp32][auth] MQTT CONNECT sending username={MQTT_USER} client_id={client._client_id.decode(errors='ignore')}")
    print(f"[mock-esp32][tls] TLS configured cafile={CA_CERT} host={MQTT_HOST}")
    print(f"[mock-esp32] Connecting mqtts://{MQTT_HOST}:{MQTT_PORT} as user={MQTT_USER}")
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_start()

    try:
        while True:
            if PUBLISH_MODE == "periodic":
                publish(client, occupied)
                time.sleep(max(PERIODIC_MS, 1) / 1000.0)
                if random.random() < CHANGE_PROB:
                    occupied = not occupied
                continue

            if random.random() < CHANGE_PROB:
                occupied = not occupied

            if occupied != last_published:
                publish(client, occupied)
                last_published = occupied

            time.sleep(CHANGE_EVERY_SEC)
    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
