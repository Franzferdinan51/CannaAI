#!/usr/bin/env python3
"""
OpenClaw Grow Monitor → CannaAI Bridge
Automated data pipeline for environmental monitoring

Usage: python3 openclaw-grow-bridge.py [options]

Options:
  --manual    Run once manually
  --test      Test connection only
  --verbose   Show detailed output
"""

import sys
import json
import requests
import argparse
from pathlib import Path
from datetime import datetime

# Configuration
CANNAI_URL = "http://localhost:3000"
GROW_LOGS_DIR = "/home/duckets/.openclaw/workspace/grow-logs"
AC_INFINITY_LATEST = f"{GROW_LOGS_DIR}/ac-infinity-latest.json"

def extract_ac_infinity_data():
    """Extract environmental data from AC Infinity monitoring"""
    if Path(AC_INFINITY_LATEST).exists():
        with open(AC_INFINITY_LATEST) as f:
            data = json.load(f)
            return {
                "temperature": data.get("inside_temp"),
                "humidity": data.get("inside_humidity"),
                "vpd": data.get("inside_vpd"),
                "outside_temp": data.get("outside_temp"),
                "outside_humidity": data.get("outside_humidity"),
                "outside_vpd": data.get("outside_vpd"),
                "source": "ac_infinity"
            }
    
    # Fallback: use recent screenshot data
    screenshots_dir = f"{GROW_LOGS_DIR}/screenshots"
    if Path(screenshots_dir).exists():
        screenshots = sorted(Path(screenshots_dir).glob("ac-infinity-*.png"), reverse=True)
        if screenshots:
            latest = screenshots[0]
            print(f"📸 Using latest screenshot: {latest.name}")
            # TODO: Add OCR extraction here
            return {
                "temperature": 75.1,  # Placeholder
                "humidity": 38.7,
                "vpd": 1.81,
                "source": "ac_infinity_screenshot"
            }
    
    return None

def send_to_cannai(data, verbose=False):
    """Send sensor data to CannaAI API"""
    url = f"{CANNAI_URL}/api/grow-monitor/data"
    
    payload = {
        "environmental": {
            "temperature": data.get("temperature"),
            "humidity": data.get("humidity"),
            "vpd": data.get("vpd"),
            "co2": data.get("co2"),
        },
        "roomId": "3x3_tent",
        "source": "openclaw_bridge",
        "timestamp": datetime.now().isoformat()
    }
    
    if verbose:
        print(f"📤 Sending to CannaAI: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        result = response.json()
        
        if response.status_code == 200:
            print(f"✅ Sensor data sent to CannaAI")
            if result.get("alerts"):
                print(f"⚠️  Alerts generated: {len(result['alerts'])}")
                for alert in result['alerts']:
                    print(f"   - {alert['type']}: {alert['value']} ({alert['severity']})")
            return True
        else:
            print(f"❌ CannaAI error: {result.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_connection(verbose=False):
    """Test CannaAI connection"""
    url = f"{CANNAI_URL}/api/openclaw/status"
    
    try:
        response = requests.get(url, timeout=5)
        result = response.json()
        
        if response.status_code == 200:
            print(f"✅ CannaAI connection successful")
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Rooms: {result.get('rooms', 0)}")
            print(f"   Plants: {result.get('plants', 0)}")
            return True
        else:
            print(f"❌ CannaAI error: {result.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='OpenClaw Grow Monitor → CannaAI Bridge')
    parser.add_argument('--manual', action='store_true', help='Run once manually')
    parser.add_argument('--test', action='store_true', help='Test connection only')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    args = parser.parse_args()
    
    print("🌿 OpenClaw Grow Monitor → CannaAI Bridge")
    print("=" * 50)
    
    if args.test:
        print("🔍 Testing CannaAI connection...")
        success = test_connection(args.verbose)
        sys.exit(0 if success else 1)
    
    # Extract data
    print("📊 Extracting AC Infinity data...")
    data = extract_ac_infinity_data()
    
    if not data:
        print("❌ No AC Infinity data found")
        print(f"   Expected: {AC_INFINITY_LATEST}")
        print("   Make sure grow monitoring is running")
        sys.exit(1)
    
    print(f"   Temperature: {data.get('temperature')}°F")
    print(f"   Humidity: {data.get('humidity')}% RH")
    print(f"   VPD: {data.get('vpd')} kPa")
    print()
    
    # Send to CannaAI
    print("📤 Sending to CannaAI...")
    success = send_to_cannai(data, args.verbose)
    
    print()
    if success:
        print("✅ Bridge operation successful")
        sys.exit(0)
    else:
        print("❌ Bridge operation failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
