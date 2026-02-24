#!/usr/bin/env python3
"""
Grow Monitor Bridge - Feeds AC Infinity data from OpenClaw grow monitoring to CannaAI

Usage: python3 grow-monitor-bridge.py [screenshot_path]
"""

import sys
import json
import requests
from pathlib import Path

# Configuration
CANNAI_URL = "http://localhost:3000"
GROW_LOGS_DIR = "/home/duckets/.openclaw/workspace/grow-logs"

def extract_ac_infinity_data(screenshot_path=None):
    """Extract environmental data from AC Infinity screenshot or use latest"""
    if screenshot_path:
        # TODO: Implement OCR extraction
        pass
    
    # Use latest data file if available
    latest_data = GROW_LOGS_DIR + "/data/latest.json"
    if Path(latest_data).exists():
        with open(latest_data) as f:
            return json.load(f)
    
    # Default values (should be replaced with actual data)
    return {
        "inside_temp": 75.1,
        "inside_humidity": 38.7,
        "inside_vpd": 1.81,
        "outside_temp": 77.9,
        "outside_humidity": 33.9,
        "outside_vpd": 2.09
    }

def send_to_cannai(data):
    """Send sensor data to CannaAI API"""
    url = f"{CANNAI_URL}/api/sensors"
    
    payload = {
        "temperature": data.get("inside_temp"),
        "humidity": data.get("inside_humidity"),
        "vpd": data.get("inside_vpd"),
        "source": "ac_infinity",
        "roomId": "3x3_tent"  # Configurable
    }
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        result = response.json()
        
        if response.status_code == 200:
            print(f"✅ Sensor data sent to CannaAI")
            if result.get("alerts"):
                print(f"⚠️  Alerts: {result['alerts']}")
            return True
        else:
            print(f"❌ CannaAI error: {result.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def main():
    print("🌿 Grow Monitor → CannaAI Bridge")
    print("=" * 40)
    
    # Extract data
    data = extract_ac_infinity_data()
    print(f"📊 AC Infinity Data:")
    print(f"   Inside: {data.get('inside_temp')}°F, {data.get('inside_humidity')}% RH")
    print(f"   VPD: {data.get('inside_vpd')} kPa")
    
    # Send to CannaAI
    success = send_to_cannai(data)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
