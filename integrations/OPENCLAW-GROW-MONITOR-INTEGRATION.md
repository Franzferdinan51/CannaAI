# OpenClaw Grow Monitor + CannaAI Integration

**Status:** 🚧 In Progress (2026-02-23)  
**Purpose:** Connect autonomous grow monitoring system with CannaAI cultivation management

---

## 🌿 Overview

This integration combines two powerful systems:

1. **OpenClaw Grow Monitoring** - Autonomous Android phone-based monitoring
   - AC Infinity app integration
   - Automated screen capture (every 5 min)
   - Environmental data extraction (temp, humidity, VPD)
   - Camera access for plant photos
   - Alert system (Telegram + TTS)

2. **CannaAI** - AI-powered cultivation management
   - Plant disease diagnosis
   - Multi-model AI support
   - Sensor data tracking
   - Harvest tracking
   - Cost analysis

---

## 🔧 Architecture

```
┌─────────────────────┐
│  AC Infinity App    │
│  (on Android)       │
└──────────┬──────────┘
           │
           ↓ (screen capture)
┌─────────────────────┐
│  OpenClaw Monitor   │
│  (every 5 min)      │
└──────────┬──────────┘
           │
           ↓ (data extraction)
┌─────────────────────┐
│  Grow Monitor       │
│  Bridge (Python)    │
└──────────┬──────────┘
           │
           ↓ (API POST)
┌─────────────────────┐
│  CannaAI API        │
│  /api/sensors       │
└──────────┬──────────┘
           │
           ↓ (store + analyze)
┌─────────────────────┐
│  CannaAI Dashboard  │
│  + AI Analysis      │
└─────────────────────┘
```

---

## 📊 Data Flow

### 1. Screen Capture (Every 5 Minutes)
```bash
# OpenClaw grow monitor captures AC Infinity screen
adb screencap -p /sdcard/ac-infinity.png
```

### 2. Data Extraction (OCR)
```python
# Extract temp/humidity/VPD from screenshot
python3 parse-ac-infinity.py /sdcard/ac-infinity.png
# Output: {inside_temp: 75.1, inside_humidity: 38.7, inside_vpd: 1.81}
```

### 3. Send to CannaAI
```python
# Bridge script sends to CannaAI API
python3 grow-monitor-bridge.py
# POST /api/sensors {temperature, humidity, vpd, source}
```

### 4. Store + Analyze
```typescript
// CannaAI stores in database
await prisma.sensorReading.create({...})

// Check for alerts
if (temp > 85) alerts.push('HIGH_TEMP')
```

---

## 🚀 Setup

### Prerequisites
1. OpenClaw grow monitoring system running
2. CannaAI server running (port 3000)
3. Python 3 with `requests` library

### Installation
```bash
# Clone CannaAI (if not already)
cd /home/duckets/CannaAI

# Bridge script is in integrations/
cd integrations

# Test the bridge
python3 grow-monitor-bridge.py
```

### Add to Cron (Every 15 Minutes)
```bash
# Edit crontab
crontab -e

# Add line:
*/15 * * * * /home/duckets/CannaAI/integrations/grow-monitor-bridge.py >> /home/duckets/CannaAI/integrations/bridge.log 2>&1
```

---

## 📈 API Endpoints

### Submit Sensor Data
```bash
POST http://localhost:3000/api/sensors
Content-Type: application/json

{
  "temperature": 75.1,
  "humidity": 38.7,
  "vpd": 1.81,
  "source": "ac_infinity",
  "roomId": "3x3_tent"
}
```

**Response:**
```json
{
  "success": true,
  "readingId": 123,
  "alerts": null,
  "timestamp": "2026-02-23T20:30:00.000Z"
}
```

### Get Recent Readings
```bash
GET http://localhost:3000/api/sensors?roomId=3x3_tent&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "readings": [...]
}
```

### Check CannaAI Status (OpenClaw)
```bash
GET http://localhost:3000/api/openclaw/status
```

**Response:**
```json
{
  "status": "online",
  "rooms": 1,
  "activeRooms": 1,
  "plants": 3,
  "strains": 2,
  "timestamp": "2026-02-23T20:30:00.000Z"
}
```

---

## 🚨 Combined Alert System

### OpenClaw Alerts
- Temp > 85°F or < 65°F
- Humidity > 60% or < 35%
- **Delivery:** Telegram + TTS voice

### CannaAI Alerts
- Plant health issues
- Nutrient deficiencies
- Pest detection
- **Delivery:** Dashboard + Email

### Unified Notifications
Both systems can trigger alerts - consider consolidating to single notification system.

---

## 📸 Plant Photo Analysis

### Capture Plant Photo
```bash
# Open camera and capture via OpenClaw
adb am start -a android.media.action.IMAGE_CAPTURE
adb screencap -p /sdcard/plant-view.png
```

### Send to CannaAI for Analysis
```bash
POST http://localhost:3000/api/analyze
Content-Type: application/json

{
  "image": "base64_encoded_image",
  "roomId": "3x3_tent",
  "analysisType": "health_check"
}
```

### Get AI Diagnosis
```json
{
  "success": true,
  "analysis": {
    "health": "good",
    "issues": [],
    "recommendations": ["Continue current care"]
  }
}
```

---

## 🔄 Automation Schedule

| Task | Frequency | System |
|------|-----------|--------|
| Screen Capture | Every 5 min | OpenClaw |
| Data Extraction | Every 5 min | OpenClaw |
| Send to CannaAI | Every 15 min | Bridge |
| Status Check | Every 3 hours | OpenClaw |
| Plant Photos | On demand | Both |
| AI Analysis | On demand | CannaAI |

---

## 📊 Dashboard Integration

### CannaAI Dashboard Shows:
- Live sensor data from AC Infinity
- Historical trends
- Alert history
- Plant health analysis
- Harvest predictions

### OpenClaw Monitoring Shows:
- Real-time AC Infinity readings
- System health status
- Connection status
- Screenshot history

**Future:** Unified dashboard combining both views.

---

## 🛠️ Troubleshooting

### Bridge Not Sending Data
```bash
# Check CannaAI is running
curl http://localhost:3000/api/openclaw/status

# Test bridge manually
python3 grow-monitor-bridge.py

# Check logs
tail -f /home/duckets/CannaAI/integrations/bridge.log
```

### Data Not Appearing in CannaAI
```bash
# Check database
sqlite3 /home/duckets/CannaAI/prisma/dev.db "SELECT * FROM SensorReading ORDER BY timestamp DESC LIMIT 5;"

# Check API endpoint
curl http://localhost:3000/api/sensors
```

### OpenClaw Screen Capture Failing
```bash
# Check ADB connection
adb devices

# Test manual capture
adb shell screencap -p /sdcard/test.png
adb pull /sdcard/test.png
```

---

## 🎯 Future Enhancements

1. **Two-Way Sync** - CannaAI recommendations → OpenClaw alerts
2. **Automated Climate Control** - CannaAI → AC Infinity device control
3. **Unified Dashboard** - Single view for all data
4. **Mobile App** - Monitor from anywhere
5. **ML Predictions** - Yield forecasting, optimal harvest timing
6. **Multi-Room Support** - Scale to multiple tents/rooms

---

**Created:** 2026-02-23  
**Status:** 🚧 Integration In Progress  
**Next:** Test bridge script, add to cron, verify data flow
