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

- Node.js 22+ (or Termux on Android — see Android section below)
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

## 📱 Android / Termux Support

CannaAI runs on Android devices via Termux — no Node.js PC required.

### Android Backend (Python — Zero Node Dependencies) ⭐
```bash
cd android_backend
python3 cannaai_server.py
# Server starts on port 3000 with full plant analysis
```

**API Endpoints:**
- `GET /api/health` — health check
- `POST /api/analyze` — plant health analysis with vision AI
- `GET /api/strains` — strain database
- `GET /api/chat?message=...` — cannabis grow assistant

### Termux-Specific Fixes (Critical for Python Backend)

1. **Use `qwen3.5-0.8b` for vision** — `gemma-4-26b-a4b` hangs on Termux API calls
2. **Use curl subprocess, NOT urllib** — urllib hangs on Termux when calling LM Studio
3. **Set TMPDIR to `/data/data/com.termux/files/usr/tmp`** — `/tmp` is a restricted symlink on Android

```python
# Correct LM Studio call from Termux:
import subprocess, os
tmp_dir = os.environ.get('TMPDIR', '/data/data/com.termux/files/usr/tmp')
req_file = f"{tmp_dir}/req_{os.getpid()}.json"
subprocess.run(['curl', '-s', '--max-time', '120', '-X', 'POST',
    f'{LM_STUDIO_URL}/chat/completions',
    '-H', 'Content-Type: application/json',
    '-H', f'Authorization: Bearer {API_KEY}',
    '--data-binary', f'@{req_file}'], capture_output=True, timeout=130)
```

### Full CannaAI on Termux
```bash
# Install Node.js in Termux
pkg install nodejs

# Install dependencies (esbuild fix for android-arm64)
pm install @esbuild/android-arm64 --force

# Start server
npm run dev
```

### Android Compatibility Notes
- `sharp` image processing is bypassed by default on android-arm64 — uses `image-simple.ts` (pure JS, no native binaries)
- `heic-convert` is lazy-loaded to avoid Node.js/localStorage compatibility issues
- Prisma may need `binaryTargets = ["native", "debian-openssl-1.1.x"]` in `prisma/schema.prisma`
- Use the Python backend (`android_backend/`) for zero-dependency plant monitoring

### ADB Control via OpenClaw
Connect to your Android device wirelessly via ADB:
```bash
# Get wireless ADB IP and port from Developer Options → Wireless Debugging
adb connect <device-ip>:<port>
# e.g. adb connect 100.91.33.100:40835
```
OpenClaw can then take screenshots, tap, swipe, and interact with the CannaAI web UI directly.

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

![Version](https://img.shields.io/badge/version-0.3.0-brightgreen.svg)
![Last Updated](https://img.shields.io/badge/last%20updated-April%2021%2C%2026-blue.svg)

**Last Updated:** April 21, 2026
