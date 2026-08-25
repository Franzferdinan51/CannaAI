# CannaAI Skill for OpenClaw

**Purpose:** Plant health analysis, grow monitoring, and cannabis cultivation expertise for OpenClaw agents

**Status:** 🚧 In Development

---

## 🎯 What This Skill Does

Allows any OpenClaw agent to:
- ✅ Analyze plant photos for health issues
- ✅ Get strain-specific growing advice
- ✅ Monitor environmental data (temp, humidity, VPD)
- ✅ Track grow progress over time
- ✅ Get harvest predictions
- ✅ Diagnose pests, diseases, nutrient issues

---

## 🛠️ Installation

```bash
# Clone CannaAI repo
cd ~/Desktop
git clone https://github.com/Franzferdinan51/CannaAI.git
cd CannaAI

# Install dependencies
npm install

# Link as OpenClaw skill
ln -s ~/Desktop/CannaAI/openclaw-skill ~/.openclaw/skills/cannaai
```

---

## 📖 Usage

### Basic Plant Analysis
```bash
openclaw agent --message "Analyze this plant photo" --file plant.jpg
```

### Environmental Check
```bash
openclaw agent --message "Check my grow room conditions"
```

### Strain Advice
```bash
openclaw agent --message "What's the optimal humidity for Grand Daddy Purple in flower stage?"
```

### Harvest Prediction
```bash
openclaw agent --message "When should I harvest based on trichome photos?"
```

---

## 🔧 API Endpoints

The skill exposes these methods to OpenClaw agents:

### `cannaai.analyze`
Analyze plant health from photo

**Input:**
```json
{
  "image": "base64...",
  "strain": "Grand Daddy Purple",
  "stage": "flowering",
  "symptoms": ["yellowing leaves", "brown spots"]
}
```

**Output:**
```json
{
  "healthScore": 82,
  "diagnosis": "Nutrient deficiency suspected",
  "recommendations": ["Check pH", "Add magnesium"],
  "confidence": 0.95
}
```

### `cannaai.environment`
Check environmental conditions

**Input:**
```json
{
  "roomId": "grow-tent-1"
}
```

**Output:**
```json
{
  "temperature": 74.7,
  "humidity": 39.0,
  "vpd": 1.78,
  "status": "optimal"
}
```

### `cannaai.strain-info`
Get strain-specific growing info

**Input:**
```json
{
  "strain": "Grand Daddy Purple"
}
```

**Output:**
```json
{
  "type": "Indica",
  "flowerTime": "8-9 weeks",
  "optimalTemp": "65-80°F",
  "optimalHumidity": "40-50%",
  "notes": "Purples in cold temperatures"
}
```

---

## 📁 Files

```
openclaw-skill/
├── SKILL.md              # Skill documentation
├── index.ts              # Main skill entry point
├── tools/
│   ├── analyze-plant.ts  # Plant analysis tool
│   ├── environment.ts    # Environmental monitoring
│   └── strain-info.ts    # Strain database
└── package.json
```

---

## 🔑 Configuration

The skill defaults to `http://127.0.0.1:3000`. When OpenClaw runs on a
different host (for example, a phone or remote node), configure the reachable
CannaAI address and the same API token used by the server:

```bash
export CANNAAI_API_URL="https://cannaai.example.ts.net"
export CANNAAI_API_TOKEN="use-the-cannaai-api-token"
```

`CANNAAI_URL` is accepted as a compatibility alias. Image tools accept raw
base64 or an existing `data:image/...` URL and preserve an existing data URL.

Add to `~/.openclaw/workspace/AGENTS.md`:

```markdown
## Skills

### cannaai
- **Purpose:** Plant health analysis and grow monitoring
- **Models:** Uses OpenClaw routing (Qwen-VL for vision)
- **Triggers:** 
  - "analyze plant"
  - "check grow"
  - "plant health"
  - "harvest prediction"
  - "strain advice"
```

---

## 🧪 Testing

```bash
# Test skill directly
openclaw skill test cannaai --method analyze --input test-plant.jpg

# Test via agent
openclaw agent --message "What's wrong with this plant?" --file sick-plant.jpg
```

---

## 📊 Integration Points

### With AC Infinity
- Pull environmental data automatically
- Alert on threshold breaches
- Log trends over time

### With CannaAI Database
- Access strain database
- Track plant history
- Generate reports

### With OpenClaw Channels
- Send alerts to Telegram/WhatsApp/Discord
- Receive plant photos via chat
- Post daily grow reports

---

**Status:** Ready for implementation  
**Priority:** HIGH  
**Estimated Effort:** 2-3 hours

---

**Last Updated:** 2026-02-25 21:20 EST
