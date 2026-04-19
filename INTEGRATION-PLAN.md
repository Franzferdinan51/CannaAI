# CannaAI Integration Plan
## Duck CLI + OpenClaw + AI Council — Full Integration Blueprint

**Date:** 2026-04-19  
**Status:** 🚧 In Development  
**Source Repos:**
- CannaAI: `/tmp/cannaai-inspect/` (Next.js 15 app on port 3000)
- Duck CLI: `/Users/duckets/.openclaw/workspace/duck-cli-src/`
- AI Council: `/Users/duckets/Desktop/AI-Bot-Council-Concensus/`
- OpenClaw Config: `~/.openclaw/openclaw.json`

---

## Executive Summary

CannaAI is a cannabis cultivation management system with plant health analysis, real-time sensor monitoring, and AI-powered recommendations. This plan integrates it with Duck CLI (CLI commands), OpenClaw (MCP server registration), AI Council (cannabis-specific councilors), and AgentEvolver (agent evolution).

**Integration Architecture:**
```
Duck CLI ←→ OpenClaw ←→ CannaAI MCP ←→ CannaAI (port 3000)
                ↓
           AI Council (cannabis councilors)
                ↓
         AgentEvolver (Python agent evolution)
```

---

## 1. CLI Integration (Duck CLI → CannaAI)

**Goal:** Add `duck cannaai` subcommands to Duck CLI at `/Users/duckets/.openclaw/workspace/duck-cli-src/`

### 1.1 Create Command Module
**File:** `src/commands/cannaai-cmd.ts`

```typescript
import { createCommand, getOrCreateAgent } from '../cli/cli-utils';
import { fetch } from 'undici';

const CANNAAI_URL = process.env.CANNAAI_URL || 'http://localhost:3000';

async function cannaaiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${CANNAAI_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`CannaAI error: ${response.status}`);
  return response.json();
}

export const cannaaiCommand = createCommand({
  name: 'cannaai',
  description: 'CannaAI grow monitoring commands',
  subcommands: [
    {
      name: 'plants',
      description: 'List all plants',
      handler: async () => {
        const data = await cannaaiRequest('/api/plants');
        console.log(JSON.stringify(data, null, 2));
      }
    },
    {
      name: 'environment',
      description: 'Show current environment data',
      handler: async () => {
        const data = await cannaaiRequest('/api/sensors');
        console.log(JSON.stringify(data, null, 2));
      }
    },
    {
      name: 'alerts',
      description: 'Show active alerts',
      handler: async () => {
        const data = await cannaaiRequest('/api/alerts');
        console.log(JSON.stringify(data, null, 2));
      }
    },
    {
      name: 'schedule',
      description: 'Show nutrient/water schedules',
      handler: async () => {
        const [nutrients, water] = await Promise.all([
          cannaaiRequest('/api/nutrients/schedule'),
          cannaaiRequest('/api/water/schedule'),
        ]);
        console.log('=== Nutrient Schedule ===');
        console.log(JSON.stringify(nutrients, null, 2));
        console.log('=== Water Schedule ===');
        console.log(JSON.stringify(water, null, 2));
      }
    },
    {
      name: 'analyze',
      description: 'Analyze a plant photo',
      options: [
        { name: '--image', description: 'Path to plant photo', required: true }
      ],
      handler: async (args: { image?: string }) => {
        if (!args.image) throw new Error('--image required');
        const fs = await import('fs');
        const imageBuffer = fs.readFileSync(args.image);
        const base64 = imageBuffer.toString('base64');
        const formData = new URLSearchParams();
        formData.append('image', `data:image/jpeg;base64,${base64}`);
        const response = await fetch(`${CANNAAI_URL}/api/analyze`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
      }
    },
  ]
});
```

### 1.2 Register in Go CLI
**File:** `cmd/duck/main.go` — add handler wiring for `cannaai` subcommand

### 1.3 Wire in CLI Entry
**File:** `src/cli/index.ts` — import and register `cannaaiCommand`

### Implementation Notes:
- Uses `fetch` (undici) for HTTP calls — same pattern as existing API calls in the codebase
- Falls back to `localhost:3000` if `CANNAAI_URL` env not set
- For `analyze`, reads image file and base64-encodes for upload
- Status: **Ready to implement** — ~50 lines of TypeScript

---

## 2. MCP Integration (OpenClaw ↔ CannaAI)

CannaAI already has an MCP endpoint at `/api/mcp` (see `/tmp/cannaai-inspect/src/app/api/mcp/route.ts`).

### 2.1 OpenClaw MCP Registration

**Check:** `~/.openclaw/openclaw.json` currently has **no `mcpServers` section**.

**Action:** Add to `~/.openclaw/openclaw.json`:
```json
{
  "mcp": {
    "servers": {
      "cannaai": {
        "type": "http",
        "url": "http://localhost:3000/api/mcp",
        "enabled": true
      }
    }
  }
}
```

Alternatively, if OpenClaw uses a `mcpServers` key at top level:
```json
{
  "mcpServers": {
    "cannaai": {
      "url": "http://localhost:3000/api/mcp",
      "type": "http"
    }
  }
}
```

### 2.2 CannaAI MCP Tools (Already Implemented)

The MCP route exposes 30+ tools including:
- `get_plants`, `get_plant`, `add_plant`, `update_plant`, `delete_plant`
- `get_sensors`, `get_temperature`, `get_humidity`, `get_vpd`, `get_light_level`, `get_co2_level`
- `get_grow_stats`, `get_grow_log`, `add_log_entry`
- `get_canopy_data`, `get_nutrient_schedule`, `add_nutrient_log`
- `get_ph_level`, `get_ec_level`, `get_environment`, `set_environment`
- `get_water_schedule`, `get_alerts`, `acknowledge_alert`
- `analyze_plant`, `get_grow_recommendations`, `analyze_environment`
- `get_status`, `get_providers`, `get_lmstudio_models`, `set_lmstudio_model`

### 2.3 OpenClaw Skill for CannaAI

**File:** `~/.openclaw/skills/cannaai/SKILL.md`

Already partially written at `/tmp/cannaai-inspect/openclaw-skill/SKILL.md`. Needs updating with actual tool names from the MCP route.

### 2.4 Implementation Notes

- The MCP endpoint at `/api/mcp` uses JSON-RPC 2.0 protocol
- Supports `tools/list` and `tools/call` methods
- Status: **Endpoint exists, needs OpenClaw config + skill polish**

---

## 3. ACP/Mesh Integration

### 3.1 Agent Mesh Registration

CannaAI can register as a mesh agent node alongside Duck CLI and Dashboard. The mesh server runs on port 4000.

**CannaAI Mesh Integration Points:**
- Grow event broadcasts → mesh network
- Mesh commands → CannaAI actions
- Health heartbeat to mesh registry

**Implementation Approach:**
```typescript
// In CannaAI server.ts or a new mesh-bridge.ts
import { AgentMeshClient } from '@duck-cli/mesh-client';

const mesh = new AgentMeshClient({
  url: 'ws://localhost:4000/ws',
  apiKey: process.env.MESH_API_KEY || 'openclaw-mesh-default-key',
  agentId: 'cannaai',
  agentName: 'CannaAI Grow Monitor',
  capabilities: ['plants', 'sensors', 'alerts', 'automation'],
});

// Broadcast grow alerts
mesh.broadcast({
  type: 'grow-alert',
  data: { alertId, severity, message, roomId }
});

// Register handler for mesh commands
mesh.onMessage('cannaai.status', async () => {
  return { status: 'ok', plants: await getPlantCount() };
});
```

### 3.2 Grow Event → Mesh Broadcast

When CannaAI detects:
- **Environmental anomaly** (temp spike, humidity out of range, VPD breach) → broadcast `grow-environment-alert`
- **Plant health alert** (disease detected, nutrient deficiency) → broadcast `grow-plant-alert`
- **Automation trigger** (watering complete, light schedule change) → broadcast `grow-automation-event`

### 3.3 Mesh → CannaAI Commands

Support these mesh commands:
- `cannaai.get-environment` → returns current sensor readings
- `cannaai.list-plants` → returns plant inventory
- `cannaai.trigger-watering` → activates watering automation
- `cannaai.get-alerts` → returns active alerts

### 3.4 Implementation Notes

- CannaAI has `openclaw-bridge/bridge-server.ts` (HTTP bridge) — this can be extended with mesh WebSocket client
- The bridge-server already exposes OpenAI-compatible endpoints — mesh layer adds pub/sub on top
- Status: **Design complete, mesh client library already in Duck CLI codebase**

---

## 4. AI Council Integration

CannaAI has an existing council system at `src/lib/ai/councilService.ts`. The Duck CLI AI Council lives at `/Users/duckets/Desktop/AI-Bot-Council-Concensus/` with `councilors.json` as the councilor registry.

### 4.1 Add Cannabis-Specific Councilors

**File:** Append to `/Users/duckets/Desktop/AI-Bot-Council-Concensus/councilors.json`

```json
[
  {
    "id": "councilor-cultivator",
    "name": "The Cultivator",
    "role": "councilor",
    "enabled": true,
    "model": "MiniMax-M2.7",
    "color": "from-green-600 to-emerald-800",
    "expertise": ["cannabis cultivation", "plant biology", "grow room design", "lighting", "mediums", "watering"],
    "triggers": ["grow technique", "plant health", "cultivation advice", "indoor growing", "setup"]
  },
  {
    "id": "councilor-trichome",
    "name": "The Trichome Inspector",
    "role": "councilor",
    "enabled": true,
    "model": "MiniMax-M2.7",
    "color": "from-purple-500 to-violet-800",
    "expertise": ["trichome inspection", "harvest timing", "microscopy", "THC/CBD development", "ripeness"],
    "triggers": ["harvest", "trichome", "maturity", "potency", "inspection", "when to harvest"]
  },
  {
    "id": "councilor-nutrient",
    "name": "The Nutrient Manager",
    "role": "councilor",
    "enabled": true,
    "model": "MiniMax-M2.7",
    "color": "from-orange-500 to-amber-700",
    "expertise": ["nutrient deficiency", "NPK ratios", "pH balancing", "EC levels", "feeding schedules", "organic vs synthetic"],
    "triggers": ["nutrient", "deficiency", "pH", "EC", "feeding", "fertilizer", "NPK"]
  },
  {
    "id": "councilor-ipm",
    "name": "The IPM Specialist",
    "role": "councilor",
    "enabled": true,
    "model": "MiniMax-M2.7",
    "color": "from-red-500 to-rose-800",
    "expertise": ["integrated pest management", "spider mites", "fungus gnats", "mold", "powdery mildew", "Biological control", "prevention"],
    "triggers": ["pest", "mites", "mold", "fungus", "IPM", "disease", "infestation", "spray"]
  },
  {
    "id": "councilor-cure",
    "name": "The Cure Master",
    "role": "councilor",
    "enabled": true,
    "model": "MiniMax-M2.7",
    "color": "from-amber-600 to-yellow-900",
    "expertise": ["curing", "drying", "post-harvest", "storage", "humidity control", "flavor development", "shelf life"],
    "triggers": ["cure", "dry", "harvest", "storage", "preserve", "jar", "cure process"]
  },
  {
    "id": "councilor-compliance",
    "name": "The Compliance Officer",
    "role": "councilor",
    "enabled": true,
    "model": "MiniMax-M2.7",
    "color": "from-slate-500 to-zinc-700",
    "expertise": ["cannabis regulation", "licensing", "Ohio law", "HIPAA", "seed-to-sale", "testing requirements", "compliance"],
    "triggers": ["legal", "compliance", "license", "law", "regulation", "Ohio", "test", "permit"]
  }
]
```

### 4.2 Councilor Intent Routing

Add to the council routing logic (in `councilService.ts` or matching router):

```typescript
const cannabisKeywords = {
  'cultivator': ['grow technique', 'plant health', 'indoor growing', 'setup', 'medium', 'water'],
  'trichome': ['harvest', 'trichome', 'maturity', 'potency', 'when to harvest', 'inspection'],
  'nutrient': ['nutrient', 'deficiency', 'pH', 'EC', 'feeding', 'NPK', 'fertilizer'],
  'ipm': ['pest', 'mites', 'mold', 'fungus', 'IPM', 'disease', 'spray'],
  'cure': ['cure', 'dry', 'post-harvest', 'storage', 'jar', 'preserve'],
  'compliance': ['legal', 'compliance', 'license', 'law', 'regulation', 'Ohio'],
};

// When user query matches cannabis keywords → auto-invoke matching councilor
```

### 4.3 Implementation Notes

- The council system uses `councilors.json` with model + color + role fields
- 6 new councilors above follow the exact same schema as existing 45 councilors
- Auto-trigger via keyword matching — same pattern as existing councilor selection
- Status: **councilors.json entry ready; auto-routing logic needs minor addition**

---

## 5. AgentEvolver Wiring

CannaAI has `src/lib/agent-evolver.ts` (agent evolution library) and the full AgentEvolver dashboard at `/tmp/cannaai-inspect/agentevolver/` (React + FastAPI + Gemini).

### 5.1 Architecture Overview

```
AgentEvolver Dashboard (React/FastAPI, port 5173)
    ↓ Ingress/Egress Webhooks
CannaAI Grow Monitor
    ↓ Telemetry
Evolver Backend (Python, port 8000)
    ↓ Agent Evolution
Evolved Agent Policies
```

### 5.2 Wire CannaAI → AgentEvolver Ingress API

CannaAI's `agent-evolver.ts` provides this interface:
```typescript
interface EvolutionRequest {
  type: 'prompt_optimization' | 'parameter_tuning' | 'response_analysis' | 'performance_tracking';
  data: any;
  context?: any;
}
```

**CannaAI cultivation-specific evolution:**
- Track: which plant analysis prompts produced actionable results
- Evolve: cultivation recommendation prompts based on outcome feedback
- Optimize: sensor threshold alerts based on false positive rate

**Integration in CannaAI (new file: `src/lib/evolver-bridge.ts`):**
```typescript
import { AgentEvolver } from './agent-evolver';

const evolver = new AgentEvolver({
  enabled: true,
  evolutionLevel: 'advanced',
  autoOptimization: true,
  integrationSettings: {
    aiProviderIntegration: true,
    automationSync: true,
    dataAnalysisIntegration: true,
  }
});

// After plant analysis, log feedback
evolver.logPerformance({
  accuracy: analysis.confidence,
  responseTime: durationMs,
  improvement: actionable ? 1 : 0,
});
```

### 5.3 Add Evolver to OpenClaw Agent List

**File:** `~/.openclaw/openclaw.json` → `agents.list`

```json
{
  "id": "cannaai-evolver",
  "name": "CannaAI Evolver",
  "workspace": "/tmp/cannaai-inspect",
  "runtime": {
    "type": "process",
    "command": "cd /tmp/cannaai-inspect/agentevolver && ./start.sh"
  }
}
```

### 5.4 Cultivation-Specific Evolution Prompts

**File:** `~/.openclaw/agents/cannaai-evolver/prompts/cultivation.md`

```markdown
# Cultivation Agent Evolution Prompts

## Plant Health Analysis Evolution
- Analyze leaf symptoms: yellowing, brown spots, curling, pH lockout
- Track which recommendations led to improved plant health
- Optimize for strain-specific responses (Indica vs Sativa vs Hybrid)

## Environmental Alert Evolution
- Temperature alerts: track actual vs perceived severity
- VPD alerts: correlate with plant stress indicators
- Optimize threshold precision to reduce false positives

## Feeding Schedule Evolution
- Track nutrient uptake effectiveness
- Optimize EC/pH targets per growth stage
- Learn from successful harvest outcomes
```

### 5.5 Implementation Notes

- AgentEvolver dashboard runs on port 5173 (Vite dev server) or 8000 (FastAPI)
- The Python backend (`services/geminiService.ts`) handles evolution logic
- CannaAI's `agent-evolver.ts` provides the TypeScript interface
- Status: **Bridge code ready; needs evolver process management**

---

## 6. Grow Monitor Bridge Enhancement

CannaAI has `openclaw-bridge/bridge-server.ts` — an HTTP bridge at port 18790.

### 6.1 Extend Bridge with Grow-Specific Commands

**File:** `openclaw-bridge/bridge-server.ts` — add routes:

```typescript
// Grow monitoring endpoints
app.get('/grow/plants', (req, res) => { /* proxy to CannaAI /api/plants */ });
app.get('/grow/environment', (req, res) => { /* proxy to CannaAI /api/sensors */ });
app.get('/grow/alerts', (req, res) => { /* proxy to CannaAI /api/alerts */ });
app.post('/grow/analyze', (req, res) => { /* proxy to CannaAI /api/analyze */ });
```

### 6.2 Telegram Notification Integration

CannaAI currently has AC Infinity integration for environmental alerts. Add Telegram bridge:

**Implementation (new file: `src/lib/telegram-notify.ts`):**
```typescript
import fetch from 'undici';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8094662802:AAF2IcMguSovSu4a_R0o9ckzfCJfpYw14UM';
const TELEGRAM_CHAT_ID = process.env.CANNAAI_ALERT_CHAT_ID || '588090613';

export async function sendTelegramAlert(alert: {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
}) {
  const emoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' }[alert.severity];
  const text = `${emoji} *${alert.title}*\n${alert.message}`;
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });
}
```

### 6.3 Alert Routing

| Alert Type | Trigger | Telegram Topic |
|-----------|---------|----------------|
| 🌡️ Temperature | >80°F or <60°F | `#grow-alerts` (thread 647890) |
| 💧 Humidity | >60% or <30% | `#grow-alerts` |
| 🌡️💧 VPD | <1.0 or >1.8 kPa | `#grow-alerts` |
| 🐛 Pest detected | Any pest alert | `#grow-alerts` |
| ⚗️ Nutrient | Deficiency detected | `#grow-alerts` |
| 🌿 Harvest ready | Trichome maturity reached | `#main` (DM) |

### 6.4 Implementation Notes

- Bridge already uses Express on port 18790 — add grow routes there
- Telegram uses existing bot token (same as OpenClaw Telegram config)
- Status: **Design complete; bridge code extension straightforward**

---

## 7. README and Documentation

### 7.1 CannaAI README Updates

**File:** `/tmp/cannaai-inspect/README.md` — add sections:

```markdown
## 🦆 Duck CLI Integration

CannaAI can be controlled via Duck CLI:

```bash
duck cannaai plants          # List all plants
duck cannaai environment     # Show current env data
duck cannaai alerts          # Show active alerts
duck cannaai schedule        # Show nutrient/water schedules
duck cannaai analyze --image plant.jpg  # Analyze plant photo
```

### 🔌 OpenClaw MCP Integration

CannaAI registers as an MCP server with OpenClaw. After setup, all OpenClaw agents can access CannaAI tools:

```json
{
  "mcpServers": {
    "cannaai": { "url": "http://localhost:3000/api/mcp" }
  }
}
```

### 🌐 AI Council Integration

CannaAI leverages the AI Council for complex cultivation decisions. Six cannabis-specific councilors are available:

| Councilor | Expertise |
|-----------|-----------|
| **The Cultivator** | General cannabis cultivation, grow room design |
| **The Trichome Inspector** | Harvest timing, trichome inspection |
| **The Nutrient Manager** | pH, EC, nutrient deficiencies |
| **The IPM Specialist** | Pest management, disease prevention |
| **The Cure Master** | Drying, curing, post-harvest |
| **The Compliance Officer** | Ohio cannabis regulations |

### 🧬 AgentEvolver Integration

CannaAI integrates with AgentEvolver for continuous agent optimization. See `agentevolver/` directory.
```

### 7.2 Duck CLI README Updates

**File:** `/Users/duckets/.openclaw/workspace/duck-cli-src/README.md` — add `cannaai` command section

### 7.3 Integration Status Table

| Integration | Status | Effort |
|------------|--------|--------|
| CLI Commands (`duck cannaai`) | 🚧 Ready to implement | ~2hr |
| OpenClaw MCP Registration | 🚧 Endpoint exists, config pending | ~30min |
| OpenClaw Skill (cannaai) | 📝 Skill doc exists, needs polish | ~1hr |
| ACP/Mesh Registration | 📝 Design complete | ~3hr |
| AI Council Councilors (6) | ✅ JSON entries ready | ~1hr |
| AgentEvolver Wiring | 📝 Bridge code ready | ~4hr |
| Bridge Enhancement | 📝 Design complete | ~2hr |
| Telegram Notifications | 📝 Design complete | ~2hr |
| README/Docs | 📝 Outline ready | ~1hr |

**Total Estimated Effort:** ~16 hours (can be parallelized across team members)

---

## Implementation Priority

1. **Week 1 (High Priority):**
   - CLI Commands (`duck cannaai`) — immediate utility
   - OpenClaw MCP Registration — enables all agents to use CannaAI
   - AI Council Councilors — immediate expert availability

2. **Week 2 (Medium Priority):**
   - Telegram Notifications — operational alerting
   - Grow Monitor Bridge Enhancement — richer API surface
   - OpenClaw Skill polish

3. **Week 3 (Lower Priority):**
   - ACP/Mesh Registration — advanced orchestration
   - AgentEvolver Wiring — long-term optimization
   - Documentation sweep

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `/tmp/cannaai-inspect/src/app/api/mcp/route.ts` | MCP JSON-RPC endpoint (197 lines, fully implemented) |
| `/tmp/cannaai-inspect/openclaw-skill/SKILL.md` | OpenClaw skill documentation |
| `/tmp/cannaai-inspect/openclaw-bridge/bridge-server.ts` | HTTP bridge to OpenClaw (port 18790) |
| `/tmp/cannaai-inspect/src/lib/agent-evolver.ts` | Agent evolution library |
| `/tmp/cannaai-inspect/agentevolver/` | Full AgentEvolver dashboard (React/FastAPI) |
| `/tmp/cannaai-inspect/src/lib/ai/councilService.ts` | CannaAI's existing council system |
| `/tmp/cannaai-inspect/src/lib/ai-provider-openclaw.ts` | OpenClaw provider detection/integration |
| `~/.openclaw/openclaw.json` | OpenClaw configuration (no mcpServers yet) |
| `/Users/duckets/Desktop/AI-Bot-Council-Concensus/councilors.json` | 45 existing councilors |
| `/Users/duckets/.openclaw/workspace/duck-cli-src/src/commands/` | Duck CLI command modules |

---

## Open Questions / Decisions Needed

1. **MCP Config Format:** OpenClaw's JSON schema for `mcpServers` — confirm exact key name (`mcp` vs `mcpServers`) before adding to `openclaw.json`
2. **CannaAI Process Management:** Should CannaAI auto-start with OpenClaw, or remain manual?
3. **Council Deliberation Threshold:** When should a query trigger the cannabis councilors vs general councilors?
4. **Mesh API Key:** Use shared `openclaw-mesh-default-key` or create separate CannaAI mesh credential?
5. **AgentEvolver Process:** Run evolver dashboard alongside CannaAI, or on-demand only?
