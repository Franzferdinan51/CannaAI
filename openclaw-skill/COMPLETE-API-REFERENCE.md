# CannaAI Complete API Reference for OpenClaw Agents

**Version:** 2026-02-24  
**Total Endpoints:** 119+  
**Base URL:** `http://localhost:3000/api`

---

## 🚀 Quick Start for OpenClaw Agents

### Check Status
```bash
curl http://localhost:3000/api/openclaw/status
```

**Response:**
```json
{
  "status": "online",
  "rooms": 2,
  "activeRooms": 1,
  "plants": 5,
  "strains": 3,
  "timestamp": "2026-02-24T20:00:00.000Z"
}
```

---

## 📊 Core Endpoints

### Status & Health
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/openclaw/status` | GET | Bot status check |
| `/status` | GET | System status |
| `/health` | GET | Health check |
| `/version` | GET | Version info |
| `/test-connection` | GET | Test connection |

### Rooms (Grow Rooms)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rooms` | GET | List all rooms |
| `/rooms` | POST | Create new room |
| `/rooms/:id` | GET | Get room details |
| `/rooms/:id` | PUT | Update room |
| `/rooms/:id` | DELETE | Delete room |
| `/rooms/:id/sensors` | GET | Room sensors |
| `/rooms/:id/plants` | GET | Room plants |
| `/rooms/:id/alerts` | GET | Room alerts |

### Plants
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plants` | GET | List all plants |
| `/plants` | POST | Add new plant |
| `/plants/:id` | GET | Get plant details |
| `/plants/:id` | PUT | Update plant |
| `/plants/:id` | DELETE | Delete plant |
| `/plants/:id/health` | GET | Plant health status |
| `/plants/:id/images` | GET | Plant images |
| `/plants/:id/history` | GET | Growth history |

### Strains
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/strains` | GET | List all strains |
| `/strains` | POST | Add new strain |
| `/strains/:id` | GET | Get strain details |
| `/strains/:id/genetics` | GET | Strain genetics |
| `/strains/:id/optimal-conditions` | GET | Optimal conditions |

### Sensors
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sensors` | GET | All sensor readings |
| `/sensors/:roomId` | GET | Room sensor readings |
| `/sensors/latest` | GET | Latest readings |
| `/sensors/history` | GET | Historical data |
| `/sensors/alerts` | GET | Sensor alerts |

---

## 🤖 AI & Analysis Endpoints

### Plant Analysis
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | AI plant analysis |
| `/analyze-simple` | POST | Simple analysis |
| `/analyze-test` | POST | Test analysis |
| `/auto-analyze` | POST | Automated analysis |
| `/swarm-analyze` | POST | Multi-agent analysis |
| `/trichome-analysis` | POST | Trichome analysis |
| `/canopy` | POST | Canopy analysis |

### AI Providers
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/providers` | GET | List AI providers |
| `/ai/providers/configure` | POST | Configure provider |
| `/ai/test` | POST | Test AI connection |

### AI Council
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/council/deliberate` | POST | AI council deliberation |
| `/council/predict` | POST | Prediction market |
| `/council/swarm-code` | POST | Swarm coding |
| `/council/search` | POST | Vector search |

### RAG Chat
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rag-chat` | POST | RAG-based chat |
| `/rag-chat/history` | GET | Chat history |
| `/rag-chat/documents` | GET | Document archive |

---

## 📈 Analytics & Metrics

### Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/overview` | GET | Overall analytics |
| `/analytics/growth` | GET | Growth analytics |
| `/analytics/environment` | GET | Environmental metrics |
| `/analytics/yield` | GET | Yield tracking |
| `/analytics/costs` | GET | Cost analysis |

### Metrics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/metrics` | GET | All metrics |
| `/metrics/vpd` | GET | VPD metrics |
| `/metrics/dli` | GET | DLI metrics |
| `/metrics/trends` | GET | Trend analysis |

### History
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/history` | GET | All history |
| `/history/:roomId` | GET | Room history |
| `/history/:plantId` | GET | Plant history |
| `/history/export` | POST | Export history |

---

## 🤖 Automation

### Automation Rules
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/automation` | GET | List automation rules |
| `/automation` | POST | Create automation rule |
| `/automation/:id` | GET | Get automation details |
| `/automation/:id` | PUT | Update automation |
| `/automation/:id` | DELETE | Delete automation |
| `/automation/test/:id` | POST | Test automation |

### Scheduled Tasks
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scheduled-tasks` | GET | List scheduled tasks |
| `/scheduled-tasks` | POST | Create task |
| `/scheduled-tasks/:id` | PUT | Update task |
| `/scheduled-tasks/:id` | DELETE | Delete task |

### Actions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/actions` | GET | List actions |
| `/actions` | POST | Execute action |
| `/actions/history` | GET | Action history |

---

## 📦 Business Management

### Harvest
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/harvest` | GET | List harvests |
| `/harvest` | POST | Record harvest |
| `/harvest/:id` | GET | Harvest details |
| `/harvest/:id/weights` | PUT | Update weights |
| `/harvest/:id/lab-results` | PUT | Add lab results |

### Inventory
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/inventory` | GET | List inventory |
| `/inventory` | POST | Add inventory item |
| `/inventory/:id` | PUT | Update item |
| `/inventory/:id` | DELETE | Delete item |
| `/inventory/low-stock` | GET | Low stock alerts |

### Costs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/costs` | GET | All costs |
| `/costs/summary` | GET | Cost summary |
| `/costs/profit-margin` | GET | Profit margin |
| `/costs/per-gram` | GET | Cost per gram |

### Clone Tracking
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cloning` | GET | List clones |
| `/cloning` | POST | Add clone |
| `/cloning/:id` | GET | Clone details |
| `/cloning/success-rates` | GET | Success rates |

---

## 🔔 Alerts & Notifications

### Alerts
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/alerts` | GET | List alerts |
| `/alerts/active` | GET | Active alerts |
| `/alerts/acknowledge/:id` | POST | Acknowledge alert |
| `/alerts/history` | GET | Alert history |

### Notifications
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications` | GET | List notifications |
| `/notifications/send` | POST | Send notification |
| `/notifications/settings` | GET | Notification settings |

### Webhooks
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks` | GET | List webhooks |
| `/webhooks` | POST | Create webhook |
| `/webhooks/:id` | DELETE | Delete webhook |
| `/webhooks/test/:id` | POST | Test webhook |

---

## 📊 Data Export & Import

### Export
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/export` | GET | Export data |
| `/export/csv` | GET | Export as CSV |
| `/export/json` | GET | Export as JSON |
| `/export/pdf` | POST | Export as PDF |

### Import
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/import` | POST | Import data |
| `/import/validate` | POST | Validate import |
| `/import/history` | GET | Import history |

### Backup
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/backup` | POST | Create backup |
| `/backup/list` | GET | List backups |
| `/backup/restore/:id` | POST | Restore backup |

---

## 🧠 Advanced Features

### Live Vision
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/live-vision` | GET | Live vision feed |
| `/live-vision/analyze` | POST | Analyze live feed |
| `/live-vision/changes` | GET | Change detection |

### OCR
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ocr` | POST | OCR processing |
| `/ocr/nutrient-labels` | POST | Nutrient label OCR |
| `/ocr/meter-reading` | POST | Meter reading OCR |

### PDF Processing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pdf` | POST | PDF processing |
| `/pdf/extract` | POST | Extract text |
| `/pdf/analyze` | POST | Analyze PDF |

### Storage
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/storage` | GET | Storage status |
| `/storage/files` | GET | List files |
| `/storage/upload` | POST | Upload file |
| `/storage/:id` | DELETE | Delete file |

---

## 🔧 Configuration & Debug

### Settings
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/settings` | GET | Get settings |
| `/settings` | PUT | Update settings |
| `/settings/ai` | GET | AI settings |
| `/settings/notifications` | GET | Notification settings |

### Database
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/db/status` | GET | Database status |
| `/db/reset` | POST | Reset database |
| `/db/migrate` | POST | Run migrations |

### Debug
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/debug` | GET | Debug info |
| `/debug/logs` | GET | System logs |
| `/debug/models-test` | GET | Test AI models |

### Socket.IO
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/socketio/` | WebSocket | Real-time connection |

---

## 📝 OpenClaw Agent Usage Examples

### Check System Status
```javascript
const status = await fetch('http://localhost:3000/api/openclaw/status');
const data = await status.json();
console.log(`CannaAI Status: ${data.status}`);
console.log(`Rooms: ${data.rooms}, Plants: ${data.plants}`);
```

### Get All Plants
```javascript
const plants = await fetch('http://localhost:3000/api/plants');
const data = await plants.json();
console.log(`Total plants: ${data.length}`);
```

### Get Sensor Readings
```javascript
const sensors = await fetch('http://localhost:3000/api/sensors');
const data = await sensors.json();
console.log('Latest sensor readings:', data);
```

### Analyze Plant Photo
```javascript
const analysis = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: 'data:image/png;base64,...',
    analysisType: 'plant_health'
  })
});
const result = await analysis.json();
console.log('Plant health analysis:', result);
```

### Get Active Alerts
```javascript
const alerts = await fetch('http://localhost:3000/api/alerts/active');
const data = await alerts.json();
if (data.length > 0) {
  console.log(`⚠️ ${data.length} active alerts`);
  data.forEach(alert => {
    console.log(`- ${alert.type}: ${alert.message}`);
  });
}
```

### Create Automation Rule
```javascript
const automation = await fetch('http://localhost:3000/api/automation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Auto Water',
    trigger: 'soil_moisture_low',
    action: 'water_plants',
    roomId: 'room_1'
  })
});
```

---

## 🌐 Network Access

| Access Type | URL |
|-------------|-----|
| **Local** | http://localhost:3000 |
| **LAN** | http://192.168.1.101:3000 |
| **Tailscale** | http://100.106.80.61:3000 |

---

## 🔑 Authentication

Most endpoints don't require authentication for local access.

For remote access, configure in Settings → Security.

---

## 📞 Support

- **GitHub:** https://github.com/Franzferdinan51/CannaAI
- **Documentation:** See README.md
- **OpenClaw Skill:** `openclaw-skill/`

---

**Last Updated:** 2026-02-24  
**Total Documented Endpoints:** 119+
