#!/usr/bin/python3
"""CannaAI sensor collector -- AC Infinity cloud API -> CannaAI ingest.

Runs on Robin (systemd timer, every 5 min). Reads both controllers
through the aci library (token at ~/.config/aci/token.json) and POSTs
inside temp/RH/VPD + port states to CannaAI's ingest endpoint, which
stores SensorReadings and raises threshold alerts. Replaces the old
path where readings only reached the dashboard bridge JSON.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.expanduser("~/tools/aci"))
import aci  # noqa: E402

API = "http://100.88.161.36:3000/api/sensors/ac-infinity"
ID_PREFIX = {"ELJCP": "H-ELJCP", "SPLWA": "G-SPLWA"}


def _inside(info):
    inside = {"temp_f": None, "rh": None, "vpd_kpa": None}
    for s in info.get("sensors") or []:
        if s.get("accessPort") != 1:
            continue
        raw = s.get("sensorData")
        prec = s.get("sensorPrecision") or 0
        val = raw
        if isinstance(raw, (int, float)) and prec > 1:
            val = raw / (10 ** (prec - 1))
        st = s.get("sensorType")
        if st == 0:
            inside["temp_f"] = val
        elif st == 2:
            inside["rh"] = val
        elif st == 3:
            inside["vpd_kpa"] = val
    return inside


def _mode_label(token, dev_id, port, load_state):
    try:
        data = aci.get_mode_settings(token, dev_id, port)
        label = aci.AT_TYPES.get(data.get("atType"))
        if label:
            return label[:20]
    except Exception:
        pass
    return "ON" if load_state else "OFF"


def _ports(token, dev_id, info):
    ports = []
    for p in sorted(info.get("ports") or [], key=lambda x: x.get("port") or 0):
        n = p.get("port")
        if not p.get("online", 1):
            ports.append({"port": n, "on": False})
            continue
        entry = {"port": n,
                 "mode": _mode_label(token, dev_id, n, p.get("loadState")),
                 "on": bool(p.get("loadState"))}
        speak = p.get("speak")
        if isinstance(speak, (int, float)):
            entry["speed"] = max(0, min(10, int(speak)))
        ports.append(entry)
    return ports


def post(payload):
    req = urllib.request.Request(
        API, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, json.loads(resp.read().decode())


def main():
    token = aci.load_token()
    posted = 0
    errors = 0
    for c in aci.get_controllers(token):
        info = c.get("deviceInfo") or {}
        inside = _inside(info)
        code = c.get("devCode")
        name = c.get("devName") or code
        if inside["temp_f"] is None or inside["rh"] is None:
            print(f"{name}: no probe attached, skipped")

            continue
        payload = {
            "deviceId": ID_PREFIX.get(code, code),
            "deviceName": name,
            "temperature": inside["temp_f"],
            "temperatureUnit": "F",
            "humidity": inside["rh"],
            "ports": _ports(token, c["devId"], info),
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        if inside["vpd_kpa"] is not None:
            payload["vpd"] = inside["vpd_kpa"]
        try:
            status, body = post(payload)
            print(f"{name}: POST {status} temp={body.get('temperatureF')}F "
                  f"rh={body.get('humidity')}% vpd={body.get('vpdKpa')} "
                  f"band={body.get('vpdBand')} alerts={body.get('alerts')}")
            posted += 1
        except Exception as e:
            print(f"{name}: POST failed: {e}")
            errors += 1
    return 0 if posted and not errors else 1


if __name__ == "__main__":
    sys.exit(main())
