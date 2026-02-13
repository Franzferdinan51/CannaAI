# CannaAI Skill for OpenClaw

Use this skill to interact with the CannaAI Cannabis Cultivation Management System.

## Setup

**CannaAI Server URL:** `http://localhost:3000` (or your network IP)

**Required Environment Variables:**
- `CANNAI_URL` - CannaAI server URL (default: http://localhost:3000)

## Capabilities

### 1. Room Management
- List all grow rooms
- Get room details (temperature, humidity, CO2)
- Create/update rooms

### 2. Plant Management
- List all plants
- Add new plants
- Update plant status
- Track plant growth stages

### 3. Strain Management
- List cannabis strains
- Add new strains
- Track strain genetics

### 4. Sensor Data
- Get real-time sensor readings
- Historical data
- Environmental alerts

### 5. AI Analysis
- Plant health analysis
- Nutrient deficiency detection
- Pest identification
- Trichome maturity assessment

## API Endpoints

### Rooms
```
GET    /api/rooms              - List all rooms
POST   /api/rooms              - Create room
GET    /api/rooms/:id          - Get room details
PUT    /api/rooms/:id          - Update room
DELETE /api/rooms/:id          - Delete room
```

### Plants
```
GET    /api/plants             - List all plants
POST   /api/plants             - Add new plant
GET    /api/plants/:id         - Get plant details
PUT    /api/plants/:id         - Update plant
DELETE /api/plants/:id         - Delete plant
```

### Strains
```
GET    /api/strains            - List all strains
POST   /api/strains            - Add new strain
GET    /api/strains/:id        - Get strain details
```

### Sensors
```
GET    /api/sensors            - Get sensor readings
GET    /api/sensors/:roomId   - Get sensors for room
```

### AI Analysis
```
POST   /api/analyze            - Analyze plant image
POST   /api/trichome-analysis  - Analyze trichome maturity
```

### Automation
```
GET    /api/automation         - List automation rules
POST   /api/automation         - Create automation rule
```

## Usage Examples

### Check Room Status
```bash
curl http://localhost:3000/api/rooms
```

### Add a Plant
```bash
curl -X POST http://localhost:3000/api/plants \
  -H "Content-Type: application/json" \
  -d '{"name":"My Plant","strain":"Blue Dream","roomId":"room_1"}'
```

### Get AI Analysis
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image":"base64..."}'
```

## Integration with OpenClaw

OpenClaw agents can call CannaAI via HTTP requests:

```javascript
// In an OpenClaw tool or skill
const response = await fetch('http://localhost:3000/api/rooms');
const rooms = await response.json();
```

## Network Access

- Local: http://localhost:3000
- Network: http://192.168.1.101:3000
- Tailscale: http://100.106.80.61:3000

## Skill Author
DuckBot 🦆
