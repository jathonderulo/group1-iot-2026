import json
import paho.mqtt.client as mqtt

client = mqtt.Client()
client.connect("localhost", 1883, 60)

payload = {
    "person_present": True,
    "stuff_on_desk": False
}

client.publish("desks/1/state", json.dumps(payload))
client.disconnect()