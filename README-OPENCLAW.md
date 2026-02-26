# CannaAI - Cannabis Cultivation Management System

🌱 **CultivAI Pro** - An advanced AI-powered cannabis cultivation management system built with Next.js 15, featuring real-time plant health analysis, sensor monitoring, automation controls, and comprehensive cultivation analytics.

## 🌟 Features

### 🤖 AI-Powered Plant Analysis
- **Smart Symptom Detection**: Advanced analysis of plant health issues including nutrient deficiencies, pests, and diseases
- **Purple Strain Intelligence**: Accurately distinguishes between genetic purple strains and phosphorus deficiency symptoms
- **Flexible Input System**: Works with minimal user input - no strain information required
- **Multi-Model Support**: Integrates 7 AI providers (LM Studio, Google Gemini, Anthropic Claude, Groq, OpenRouter, OpenAI-compatible) with intelligent fallback and AgentEvolver prompt optimization
- **Trichome Analysis**: Microscopic trichome maturity assessment for precise harvest timing
- **Live Vision Monitoring**: Real-time webcam/microscope health monitoring with change detection

### 📊 Real-Time Monitoring
- **Live Sensor Data**: Temperature, humidity, pH, EC, soil moisture, light intensity, CO2 levels
- **Multi-Room Management**: Monitor and control multiple grow rooms simultaneously
- **Environmental Alerts**: Real-time notifications for out-of-range conditions
- **Historical Data Tracking**: Trend analysis and growth progression charts

### 🤖 Automation Controls
- **Smart Watering**: Automated irrigation based on soil moisture thresholds
- **Climate Control**: Temperature and humidity regulation with customizable ranges
- **Lighting Schedules**: Vegetative and flowering photoperiod management
- **Nutrient Dosing**: Precision feeding schedules and EC management

### 📈 Analytics Dashboard
- **Growth Analytics**: Yield tracking and progression charts
- **Environmental Metrics**: VPD, DLI, and other advanced measurements
- **Performance Insights**: AI-powered recommendations for optimization
- **Historical Comparisons**: Period-over-period analysis

### 🤖 AI Assistant
- **Cultivation Chat**: Real-time advice from AI cultivation experts
- **Problem Diagnosis**: Interactive troubleshooting guidance
- **Optimization Tips**: Personalized recommendations based on current conditions
- **Multiple AI Models**: Support for 7 AI providers - LM Studio (local), Google Gemini, Anthropic Claude, Groq, OpenRouter, OpenAI-compatible, and custom models

### 🤖 AI Council Chamber (NEW)
- **Multi-Agent Deliberation**: 8 specialized AI personas debate cultivation topics
- **14 Session Modes**: Deliberation, Advisory, Prediction, Research, Swarm, Brainstorming, Peer Review, Risk Assessment, and more
- **Weighted Voting System**: Consensus-driven decision making with expert personas
- **Prediction Market**: Forecast yields, harvest dates, potency with confidence intervals
- **Swarm Coding**: Generate automation scripts via multi-phase pipelines (6/12/24 phases)
- **Argumentation Framework**: Structured debate with claim/evidence/conclusion mapping
- **Bot-Specific Memory**: Each AI persona remembers for 30 days with automatic expiration
- **Adaptive Orchestration**: Real-time session optimization based on performance metrics
- **Vector Search**: Semantic search across all council discussions and memories

### 🗃️ Strain Management
- **Custom Strain Database**: Add and manage your own strain profiles
- **Optimal Conditions**: Store and recall strain-specific environmental parameters
- **Deficiency Tracking**: Monitor common issues per strain
- **Purple Strain Support**: Special handling for anthocyanin-producing varieties

### 📊 Business Management
- **Harvest Tracking**: Record wet/dry weights, THC/CBD percentages, quality grades, and yields per plant
- **Inventory Management**: Track nutrients, equipment, soil/medium with cost tracking and low stock alerts
- **Clone & Propagation**: Monitor cloning success rates, rooting methods, and batch tracking
- **Cost Analysis**: Comprehensive expense/revenue tracking with profit margin analysis and cost-per-gram calculations
- **Financial Analytics**: Real-time profitability metrics, category breakdowns, and ROI analysis

### 🧠 AgentEvolver - Self-Evolving AI System (New UI)
- **Advanced Dashboard**: New React-based UI for managing agent evolution (Port 8000)
- **Intelligent Prompt Optimization**: Automatically optimizes AI prompts based on context and task type
- **Cannabis Domain Expertise**: Built-in knowledge of cannabis cultivation, strains, and symptoms
- **Continuous Learning**: Tracks performance metrics and evolves strategies over time
- **FastAPI Backend**: Runs as separate Python server on port 8000
- **Evolution History**: Stores last 1000 optimization records for analysis
- **Feedback Mechanism**: Learns from user feedback to improve recommendations
- **Dual-Mode Operation**: Run standalone or integrated with Next.js server

### 🚀 Deployment & Access
- **Startup Modes**: Development, production, remote access, AI backend, database reset, and more via startup.bat
- **Remote Access**: Network-accessible mode (0.0.0.0:3000) with Tailscale and LAN support
- **Static Hosting**: Full Netlify deployment with client-side AI configuration
- **Traditional Server**: Custom Node.js server with Socket.IO and full API support
- **Cross-Platform**: Windows batch scripts and Unix shell scripts for all platforms

---

## 🦞 OpenClaw Integration

CannaAI integrates with OpenClaw in **TWO ways**:

1. **HTTP Bridge** - OpenAI-compatible API for any app
2. **Native Skill** - Full OpenClaw skill with 5 specialized tools

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  CannaAI    │────▶│ HTTP Bridge  │────▶│ OpenClaw    │
│  (Port 3000)│     │ (Port 18790) │     │ Gateway     │
└─────────────┘     └──────────────┘     │ (Port 18789)│
                                          └─────────────┘
                                                │
                                          ┌─────┴─────┐
                                          │ Models    │
                                          │ Qwen/Kimi │
                                          │ MiniMax   │
                                          └───────────┘
```

---

## 🚀 Setup Instructions

### Option 1: HTTP Bridge (Recommended for Apps)

**What it does:** Provides OpenAI-compatible API endpoint that routes to OpenClaw Gateway

**Setup:**
```bash
# 1. Install dependencies
cd ~/Desktop/CannaAI/openclaw-bridge
npm install

# 2. Start the bridge
npm start

# 3. Test it
curl http://localhost:18790/health
curl http://localhost:18790/v1/models
```

**Usage:**
```bash
# Chat with OpenClaw via CannaAI
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.5-plus",
    "messages": [{"role": "user", "content": "What is CannaAI?"}]
  }'

# Analyze plant photo (vision model)
curl -X POST http://localhost:18790/v1/vision/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image_data",
    "prompt": "Analyze this cannabis plant health"
  }'
```

**Endpoints:**
- `GET /health` - Health check
- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Chat completions (OpenAI format)
- `POST /v1/vision/analyze` - Image analysis

---

### Option 2: Native OpenClaw Skill

**What it does:** Installs CannaAI as a native OpenClaw skill with 5 tools

**Setup:**
```bash
# 1. Link the skill to OpenClaw
ln -sf ~/Desktop/CannaAI/openclaw-skill ~/.openclaw/skills/cannaai

# 2. Verify installation
openclaw skills list | grep cannaai

# 3. Test the skill
openclaw agent --message "Check my grow room conditions"
openclaw agent --message "Analyze this plant photo" --file plant.jpg
```

**Available Tools:**

| Tool | Description | Example |
|------|-------------|---------|
| `analyze_plant` | Analyze plant health from photo | `"What's wrong with this plant?"` |
| `get_environment` | Get grow room conditions | `"Check temperature and humidity"` |
| `get_strain_info` | Get strain-specific advice | `"Optimal conditions for GDP"` |
| `track_growth` | Log growth progress | `"Day 45 of flower, looking good"` |
| `predict_harvest` | Estimate harvest readiness | `"When should I harvest?"` |

**Usage Examples:**
```bash
# Plant analysis
openclaw agent --message "Analyze this plant for nutrient deficiencies" \
  --file sick-plant.jpg

# Environmental check
openclaw agent --message "What's the current VPD in my grow room?"

# Strain advice
openclaw agent --message "What humidity should Grand Daddy Purple have in week 6 of flower?"

# Harvest prediction
openclaw agent --message "I'm on day 63 of flower, when should I harvest?"
```

---

### Option 3: Direct API Access

**What it does:** Use CannaAI's built-in API directly

**Endpoints:**
```bash
# Health check
curl http://localhost:3000/api/health

# Get sensor data
curl http://localhost:3000/api/sensors

# List rooms
curl http://localhost:3000/api/rooms

# Analyze plant (requires image)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_data",
    "analysisType": "plant_health",
    "strain": "Cannabis",
    "growthStage": "flowering"
  }'
```

---

## 🔧 Configuration

### CannaAI Provider Settings

Edit `~/Desktop/CannaAI/.env`:

```bash
# PRIMARY: OpenClaw Gateway (routes to all models)
AI_PROVIDER="openclaw"
OPENCLAW_GATEWAY_URL="http://localhost:18790"
OPENCLAW_MODEL="qwen3.5-plus"
OPENCLAW_API_KEY="openclaw-local"

# FALLBACK: Alibaba Qwen (Singapore endpoint)
BAILIAN_API_KEY="sk-0a5ffe492bfe4222b8964b685554aa00"
QWEN_MODEL="qwen-vl-max-latest"
QWEN_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
```

### OpenClaw Gateway Requirements

Make sure OpenClaw Gateway is running:
```bash
# Check status
openclaw gateway status

# Start if needed
openclaw gateway start

# Check health
openclaw gateway health
```

---

## 📊 Model Routing

OpenClaw automatically routes to the best available model:

| Requested Model | Routes To | Cost | Vision |
|----------------|-----------|------|--------|
| `qwen3.5-plus` | Alibaba Qwen 3.5 Plus | FREE quota | ✅ |
| `kimi-k2.5` | NVIDIA Kimi K2.5 | FREE | ✅ |
| `minimax-m2.5` | MiniMax M2.5 | FREE | ❌ |
| `qwen-vl-max` | Alibaba Qwen-VL-Max | FREE quota | ✅ |
| `glm-4.5` | Z.AI GLM-4.5 | FREE quota | ❌ |

---

## 🧪 Testing

### Test HTTP Bridge
```bash
# Health check
curl http://localhost:18790/health

# List models
curl http://localhost:18790/v1/models

# Chat test
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.5-plus","messages":[{"role":"user","content":"Hello!"}]}'
```

### Test Native Skill
```bash
# List skills
openclaw skills list | grep cannaai

# Test plant analysis
openclaw agent --message "What is CannaAI?"

# Test with image
openclaw agent --message "Analyze this plant" --file test.jpg
```

### Test CannaAI Direct
```bash
# Health check
curl http://localhost:3000/api/health

# Get sensors
curl http://localhost:3000/api/sensors
```

---

## 🐛 Troubleshooting

### HTTP Bridge Not Starting
```bash
# Check if port is in use
lsof -ti:18790 | xargs kill -9

# Reinstall dependencies
cd ~/Desktop/CannaAI/openclaw-bridge
rm -rf node_modules package-lock.json
npm install
npm start
```

### OpenClaw Skill Not Found
```bash
# Verify symlink
ls -la ~/.openclaw/skills/cannaai

# Recreate if needed
ln -sf ~/Desktop/CannaAI/openclaw-skill ~/.openclaw/skills/cannaai

# Reload OpenClaw
openclaw gateway restart
```

### Provider Fallback Issues
```bash
# Check CannaAI config
cat ~/Desktop/CannaAI/.env | grep -E "AI_PROVIDER|OPENCLAW|BAILIAN"

# Test Alibaba directly
curl -X GET "https://dashscope-intl.aliyuncs.com/api/v1/models" \
  -H "Authorization: Bearer sk-0a5ffe492bfe4222b8964b685554aa00"
```

---

## 📚 Additional Resources

- **CannaAI Repo:** https://github.com/Franzferdinan51/CannaAI
- **OpenClaw Docs:** https://docs.openclaw.ai
- **OpenClaw Skills:** https://docs.openclaw.ai/skills/overview

---

**Status:** ✅ Production Ready  
**Last Updated:** 2026-02-25
