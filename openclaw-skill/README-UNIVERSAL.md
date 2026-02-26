# CannaAI + OpenClaw Integration

## 🌿 Universal Cannabis Cultivation Management for OpenClaw Agents

**This is a UNIVERSAL system** - designed for ANY grower, ANY setup, ANY location.

---

## 🚀 Quick Start for OpenClaw Agents

### Automated Setup
```bash
cd /path/to/CannaAI
./openclaw-skill/setup-for-openclaw.sh
```

This will:
1. ✅ Install dependencies
2. ✅ Initialize database
3. ✅ Configure AI provider (OpenClaw or your choice)
4. ✅ Start CannaAI server
5. ✅ Test all endpoints

### Manual Configuration

**1. Set your configuration:**
```bash
# Your CannaAI server URL
export CANNAI_URL="http://localhost:3000"

# Your OpenClaw Gateway URL (optional - for AI analysis)
export OPENCLAW_URL="http://localhost:18789"

# Your preferred AI models (update as better models release)
export OPENCLAW_VISUAL_MODEL="bailian/qwen3.5-plus"  # Best for plant vision
export OPENCLAW_ADVANCED_MODEL="zai/gpt-5.2"  # Best for reasoning
```

**2. Start CannaAI:**
```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

**3. Access:**
- Local: http://localhost:3000
- Network: http://YOUR_IP:3000
- Tailscale: http://YOUR_TAILSCALE_IP:3000

---

## 🌍 Works With ANY Setup

### **Grow Configurations:**
- ✅ Single room or multi-room
- ✅ Soil, hydro, or aeroponics
- ✅ Indoor, greenhouse, or outdoor
- ✅ Small home grows to commercial operations
- ✅ Any strain or plant type

### **Hardware:**
- ✅ Any environmental controllers (AC Infinity, TrolMaster, etc.)
- ✅ Any sensors (temperature, humidity, CO2, etc.)
- ✅ Any lighting systems
- ✅ Any automation equipment

### **AI Providers:**
- ✅ OpenClaw Gateway (routes to multiple models)
- ✅ Direct API access (OpenAI, Anthropic, Google, etc.)
- ✅ Local models (LM Studio, Ollama, etc.)
- ✅ Your choice of models (configurable)

### **Locations:**
- ✅ Works anywhere in the world
- ✅ Any climate or environment
- ✅ Any legal jurisdiction (follow your local laws)

---

## 📊 Universal API Endpoints

**119+ endpoints for complete cultivation management:**

### Core Features
- **Rooms** - Manage any number of grow rooms
- **Plants** - Track individual plants or batches
- **Strains** - Custom strain database
- **Sensors** - Any environmental data
- **Alerts** - Customizable thresholds

### Business Management
- **Harvest** - Track yields, weights, lab results
- **Inventory** - Nutrients, equipment, supplies
- **Costs** - Expense tracking, ROI analysis
- **Clones** - Propagation tracking

### AI & Analysis
- **Plant Analysis** - Health diagnosis (any AI model)
- **Trichome Analysis** - Harvest timing
- **Pest/Disease ID** - Problem identification
- **Recommendations** - Actionable advice

### Automation
- **Rules** - Custom automation logic
- **Schedules** - Task scheduling
- **Webhooks** - External integrations
- **Actions** - Device control

---

## 🔧 Configuration Examples

### Small Home Grow (1 Room)
```bash
# Single room setup
export ROOM_COUNT=1
export PLANT_COUNT=4
export AI_PROVIDER="openclaw"  # Or your preferred provider
```

### Multi-Room Operation
```bash
# Multiple rooms
export ROOM_COUNT=4
export PLANT_COUNT=20
export AI_PROVIDER="openclaw"
```

### Commercial Operation
```bash
# Large scale
export ROOM_COUNT=20
export PLANT_COUNT=200+
export AI_PROVIDER="openclaw"
export DATABASE="postgresql"  # Upgrade from SQLite
```

### Custom AI Models
```bash
# Use your preferred models
export OPENCLAW_VISUAL_MODEL="your-choice/vision-model"
export OPENCLAW_ADVANCED_MODEL="your-choice/reasoning-model"
export OPENCLAW_URL="your-openclaw-gateway"
```

---

## 🌐 Network Configuration

### Local Development
```bash
CANNAI_URL="http://localhost:3000"
```

### LAN Access
```bash
CANNAI_URL="http://YOUR_LOCAL_IP:3000"
# Configure firewall to allow port 3000
```

### Remote Access
```bash
# Tailscale
CANNAI_URL="http://YOUR_TAILSCALE_IP:3000"

# Or your preferred remote access method
# VPN, reverse proxy, etc.
```

---

## 🤖 OpenClaw Agent Integration

### Basic Usage
```typescript
// Check system status
const status = await fetch(`${CANNAI_URL}/api/openclaw/status`);

// Get all plants
const plants = await fetch(`${CANNAI_URL}/api/plants`);

// Get sensor data
const sensors = await fetch(`${CANNAI_URL}/api/sensors`);

// Analyze plant photo
const analysis = await fetch(`${CANNAI_URL}/api/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: base64Image,
    analysisType: 'plant_health'
  })
});
```

### Autonomous Monitoring
```typescript
// Daily plant health check
async function dailyPlantCheck() {
  const plants = await fetch(`${CANNAI_URL}/api/plants`);
  
  for (const plant of plants) {
    // Capture photo (your method)
    const photo = await capturePhoto(plant.id);
    
    // AI analysis
    const analysis = await analyzePlant(photo);
    
    // Report issues
    if (analysis.issues.length > 0) {
      await sendAlert(plant.id, analysis);
    }
  }
}
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `COMPLETE-API-REFERENCE.md` | All 119+ API endpoints |
| `MODEL-SELECTION-GUIDE.md` | Best AI models for each task |
| `FUTURE-PROOF-MODEL-GUIDE.md` | How to update models |
| `PLANT-ANALYSIS-WORKFLOW.md` | Complete analysis workflow |
| `setup-for-openclaw.sh` | Automated setup script |

---

## 🌍 Community & Support

- **GitHub:** https://github.com/Franzferdinan51/CannaAI
- **Issues:** Report bugs, request features
- **Discussions:** Share setups, tips, strains
- **Contributions:** PRs welcome!

---

## ⚖️ Legal Compliance

**IMPORTANT:** This software is for educational and legal cultivation only.

- ✅ Follow your local laws and regulations
- ✅ Obtain necessary licenses and permits
- ✅ Stay within legal plant limits
- ✅ Comply with safety and security requirements

**This tool does not provide legal advice.** Consult local authorities about cultivation laws in your area.

---

## 🎯 Designed for Everyone

**Whether you're:**
- 🏠 Growing 1-4 plants at home
- 🏢 Operating a small commercial facility
- 🏭 Running a large-scale operation
- 🧪 Research or breeding program
- 📚 Educational institution

**CannaAI scales to your needs!**

---

## 🔄 Regular Updates

**Stay current with:**
- ✅ New AI models (easy configuration)
- ✅ Feature updates
- ✅ Security patches
- ✅ Community contributions
- ✅ Best practices

**Update regularly:**
```bash
git pull origin master
npm install
npm run db:push  # If schema changes
```

---

## 🌟 Features for Everyone

### Hobby Growers
- ✅ Simple setup
- ✅ Easy plant tracking
- ✅ Basic health monitoring
- ✅ Harvest planning

### Commercial Operators
- ✅ Multi-room management
- ✅ Batch tracking
- ✅ Compliance reporting
- ✅ Cost analysis
- ✅ Yield optimization

### Researchers
- ✅ Detailed data tracking
- ✅ Environmental controls
- ✅ Strain genetics
- ✅ Export capabilities
- ✅ API access

---

## 💡 Best Practices

### For All Users
1. ✅ Regular backups
2. ✅ Monitor environmental data
3. ✅ Keep strain records updated
4. ✅ Review AI recommendations
5. ✅ Follow local regulations

### For OpenClaw Integration
1. ✅ Test endpoints before automation
2. ✅ Implement error handling
3. ✅ Log all actions
4. ✅ Monitor API rate limits
5. ✅ Keep models updated

---

**CannaAI - Cultivation Management for EVERYONE!** 🌿🌍

**Last Updated:** 2026-02-24  
**Version:** Universal Edition
