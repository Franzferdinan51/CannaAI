# CannaAI - Cannabis Cultivation Management System

🌱 **AI-Powered Cannabis Cultivation Platform**

An advanced cultivation management system with real-time plant health analysis, environmental monitoring, automation controls, and comprehensive analytics.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Start production
npm run start
```

**Access:** http://localhost:3000

---

## 🌟 Key Features

### 🤖 AI Plant Analysis
- Vision-based health diagnosis from photos
- Pest, disease, and nutrient deficiency detection
- Trichome maturity assessment
- Harvest timing predictions

### 📊 Environmental Monitoring
- Live sensor data (temp, humidity, VPD, CO2)
- Multi-room management
- Real-time alerts
- Historical trends

### 🤖 Automation
- Smart watering systems
- Climate control
- Lighting schedules
- Nutrient dosing

### 📈 Business Analytics
- Harvest tracking
- Inventory management
- Cost analysis
- ROI calculations

---

## 🦞 OpenClaw Integration

CannaAI integrates with OpenClaw for AI agent control:

### HTTP Bridge (Port 18790)
```bash
# Start bridge
cd openclaw-bridge && npm start

# Test
curl http://localhost:18790/health
```

### Native Skill
```bash
# Install skill
ln -sf ~/Desktop/CannaAI/openclaw-skill ~/.openclaw/skills/cannaai

# Use via OpenClaw
openclaw agent --message "Check my grow room conditions"
```

**📖 Full Guide:** [docs/guides/README-OPENCLAW.md](docs/guides/README-OPENCLAW.md)

---

## 📁 Project Structure

```
CannaAI/
├── src/                    # Source code
├── openclaw-bridge/        # HTTP Bridge service
├── openclaw-skill/         # OpenClaw skill
├── docs/                   # Documentation
│   ├── guides/             # Implementation guides
│   ├── developer/          # API specs
│   └── integrations/       # Third-party integrations
├── prisma/                 # Database schema
└── README.md               # This file
```

---

## 📖 Documentation

| Topic | Location |
|-------|----------|
| OpenClaw Integration | [docs/guides/README-OPENCLAW.md](docs/guides/README-OPENCLAW.md) |
| AI Providers | [docs/guides/NEW_AI_PROVIDERS_GUIDE.md](docs/guides/NEW_AI_PROVIDERS_GUIDE.md) |
| Testing Guide | [docs/guides/TESTING-GUIDE.md](docs/guides/TESTING-GUIDE.md) |
| Deployment | [docs/guides/DEPLOYMENT_CHECKLIST.md](docs/guides/DEPLOYMENT_CHECKLIST.md) |
| API Reference | [docs/developer/api/openapi-specification.md](docs/developer/api/openapi-specification.md) |
| Agent Analysis Contract | [docs/developer/api/agent-analysis-contract.md](docs/developer/api/agent-analysis-contract.md) |

**All Docs:** [docs/](docs/)

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, TailwindCSS
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL, Prisma ORM
- **AI:** OpenClaw, Qwen, Kimi, MiniMax, LM Studio
- **Monitoring:** Screen scraping for any controller app

---

## 📋 Requirements

- Node.js 22+
- PostgreSQL 15+
- npm or pnpm
- (Optional) OpenClaw Gateway

---

## 🦆 Duck CLI Integration

CannaAI is accessible via Duck CLI:

```bash
# Install (Duck CLI v0.9.0+)
# CannaAI commands are auto-registered in Duck CLI

# Check system status
duck cannaai status

# Monitor environment
duck cannaai monitor

# Analyze plant photo (direct)
duck cannaai analyze /path/to/plant.jpg

# Analyze with AI Council deliberation (6 cannabis specialists)
duck cannaai analyze /path/to/plant.jpg --council

# List plants
duck cannaai plants

# Check alerts
duck cannaai alerts

# Ask AI Council for grow advice
duck cannaai council "What nutrients does my flowering plant need?"
```

**Environment:**
- `CANNAAI_URL` — CannaAI server (default: http://localhost:3000)
- `AI_COUNCIL_URL` — AI Council server (default: http://localhost:3006)

**AI Council Cannabis Councilors:** The Cultivator, The Trichome Inspector, The Nutrient Manager, The IPM Specialist, The Cure Master, The Compliance Officer.

---

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL="postgresql://..."
OPENCLAW_GATEWAY_URL="http://localhost:18789"
LM_STUDIO_URL="http://<YOUR_WINDOWS_IP>:1234"
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run the dedicated /api/analyze integration suite
npm run test:integration:analyze

# Explainability regression smoke check
npm run check:report-quality

# Visual regression tests
npm run test:visual

# API endpoint tests
node test-api-endpoint.js
```

---

## 🚢 Deployment

### Docker
```bash
docker-compose up -d
```

### Production
```bash
npm run build
npm run start
```

### Netlify
See [docs/guides/NETLIFY_ENVIRONMENT_SETUP.md](docs/guides/NETLIFY_ENVIRONMENT_SETUP.md)

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## 📄 License

MIT - See LICENSE file

---

## 🔗 Links

- **GitHub:** https://github.com/Franzferdinan51/CannaAI
- **OpenClaw:** https://openclaw.ai
- **Documentation:** [docs/](docs/)

---

![Version](https://img.shields.io/badge/version-0.2.0-brightgreen.svg)
![Last Updated](https://img.shields.io/badge/last%20updated-April%2019%2C%2026-blue.svg)

**Last Updated:** April 19, 2026
