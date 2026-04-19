# CannaAI + Duck CLI + AI Council + OpenClaw Integration Plan

**Status:** Draft - Ready for Review  
**Date:** 2026-04-19  
**Version:** 1.0

---

## A. Current Architecture Analysis

### ✅ What's Working Today

1. **CannaAI Core App**
   - Next.js 15 app with Socket.IO real-time
   - Plant health analysis with strict JSON enforcement
   - Sensor monitoring (temp, humidity, VPD, CO2, pH, EC)
   - Strain database and grow tracking
   - Built-in MCP endpoint at `/api/mcp` (route.ts)
   - Standalone MCP server at `~/.openclaw/workspace/cannaai-mcp-server/`

2. **CannaAI MCP Integration**
   - 29+ tools for grow monitoring
   - AI analysis tools (analyze_plant, analyze_environment)
   - Dual path: built-in Next.js route OR standalone stdio server

3. **OpenClaw Skill** (`openclaw-skill/SKILL.md`)
   - Documents how to analyze plants, check environment, get strain info
   - Not fully integrated with the running CannaAI app

4. **OpenClaw Bridge** (`openclaw-bridge/bridge-server.ts`)
   - HTTP bridge on port 18790
   - Provides OpenAI-compatible endpoint routing to OpenClaw Gateway
   - Static model list (Qwen, Kimi, MiniMax)
   - NOT connected to CannaAI or AI Council

5. **AI Council** (`~/.openclaw/workspace/ai-council-mcp/`)
   - 105 tools for deliberation
   - Vision council, voting, consensus
   - 25+ councilors across multiple roles
   - NOT connected to CannaAI

### ⚠️ What's Partially Implemented

1. **AgentEvolver Integration** (`feature/agent-evolver-integration-11827709298250147886`)
   - Branch exists but not merged to master
   - Unknown what exactly it implements

2. **Grow Monitor Bridge** (`integrations/grow-monitor-bridge.py`, `openclaw-grow-bridge.py`)
   - Python bridge scripts exist
   - AC Infinity → CannaAI flow planned but not connected to Duck CLI

3. **MCP Server Branch** (`origin/mcp-server`)
   - Standalone MCP server code exists in branch
   - Already extracted to `~/.openclaw/workspace/cannaai-mcp-server/`

4. **Performance Branches** (13 bolt- branches)
   - Various optimizations exist but mostly unmerged
   - Likely outdated given recent work

5. **Security Branches** (sentinel- branches)
   - Security fixes exist in branches
   - Not merged to master

### ❌ What's Missing

1. **Duck CLI CannaAI Commands** - No `cannaai`, `cannaai-monitor`, `cannaai-analyze` commands
2. **AI Council Plant Councilors** - No cannabis cultivation specialists in the council
3. **AI Council ↔ CannaAI Connection** - Deliberation loop not wired to plant analysis
4. **Agent Mesh Connection** - CannaAI not registered as mesh node
5. **Consolidated Branches** - 13 bolt- + security branches need merging to master

---

## B. Multi-Team Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DUCK CLI v0.8.0                         │
│                    (Orchestrator / Command Center)              │
├─────────────────────────────────────────────────────────────────┤
│  duck cannaai analyze <image>  → MCP → CannaAI /api/mcp        │
│  duck cannaai monitor          → AI Council deliberation       │
│  duck cannaai status            → Mesh → CannaAI               │
├─────────────────────────────────────────────────────────────────┤
│                              ↓                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   CANNAAI    │    │  AI COUNCIL  │    │  AGENT MESH  │     │
│  │ (Grow App)   │←──→│(Deliberation)│    │(Multi-Agent) │     │
│  │  Port 3000   │    │  Port 3001   │    │   Port 4000  │     │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│         │                   │                   │              │
│         ↓                   ↓                   ↓              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │Plant Health  │    │ 25+ Council  │    │  Grow Events │   │
│  │Analysis API  │    │ + Plant Spec │    │  Broadcast   │   │
│  │ MCP Tools    │    │ Deliberation │    │  Commands    │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    AGENTEVOLVER (optional)                      │
│              (Autonomous Agent Evolution)                       │
└─────────────────────────────────────────────────────────────────┘
```

### System Roles

| System | Role | Connection |
|--------|------|------------|
| **CannaAI** | Plant grow monitoring + AI analysis (main app) | MCP server on port 3000 |
| **Duck CLI** | Orchestrator / command center | Go CLI wrapping TypeScript core |
| **AI Council** | Multi-agent deliberation for decisions | MCP server on port 3001 |
| **AgentEvolver** | Autonomous agent evolution | Standalone service |
| **OpenClaw** | Bridge and skill system | Gateway on port 18789 |

### Data Flow

**Plant Analysis Flow:**
```
User: "duck cannaai analyze plant.jpg"
  → Duck CLI (Go) → MCP call to CannaAI /api/mcp
  → CannaAI analyzes image
  → If complex (confidence < 0.7): delegate to AI Council
  → AI Council deliberation with plant councilors
  → Return verdict to Duck CLI → User
```

**Grow Monitor Flow:**
```
AC Infinity → Screen capture → OpenClaw Grow Bridge
  → CannaAI /api/sensors → Store data
  → AI Council for threshold alerts
  → Duck CLI mesh broadcast → Dashboard
```

---

## C. CLI Enhancement - Duck CLI CannaAI Commands

### Proposed Commands

```bash
# Plant analysis
duck cannaai analyze <image> [--strain=<strain>] [--stage=<stage>]
duck cannaai analyze "Check this plant photo" --file plant.jpg

# Environmental monitoring
duck cannaai monitor [--room=<room-id>] [--hours=24]
duck cannaai status

# Strain information
duck cannaai strain <strain-name>
duck cannaai strain "Grand Daddy Purple"

# Growth tracking
duck cannaai log <message>
duck cannaai plants list

# Alerts
duck cannaai alerts [--active]
duck cannaai alert acknowledge <alert-id>

# AI Council deliberation for grow decisions
duck cannaai council "Should I increase humidity in flower?"
```

### Implementation Files

| File | Purpose |
|------|---------|
| `duck-cli-src/src/commands/cannaai/` | CannaAI command handlers |
| `duck-cli-src/src/mcp/cannaai-mcp.ts` | MCP client for CannaAI |
| `duck-cli-src/src/skills/cannaai/SKILL.md` | Skill documentation |

### Sample Implementation (Go CLI wiring)

```go
// cmd/duck/main.go additions
case "cannaai":
    switch args[0] {
    case "analyze":
        // Call MCP tool analyze_plant
    case "monitor":
        // Call MCP tool get_environment
    case "status":
        // Call MCP tool get_status
    default:
        showCannaAIHelp()
    }
```

---

## D. MCP Integration Details

### Connection Architecture

```
OpenClaw MCP Registry
├── cannaai (existing, ~/.openclaw/workspace/cannaai-mcp-server/)
│   └── connects to: http://localhost:3000/api/mcp
├── ai-council (existing, ~/.openclaw/workspace/ai-council-mcp/)
│   └── connects to: http://localhost:3001
└── [new] cannaai-bridge
    └── routes: CannaAI ↔ AI Council
```

### CannaAI MCP Enhancement

Add AI Council integration to CannaAI MCP:

```typescript
// New tool: analyze_with_council
{
  name: 'analyze_with_council',
  description: 'Analyze plant with AI Council deliberation',
  inputSchema: {
    type: 'object',
    properties: {
      image: { type: 'string' },
      strain: { type: 'string' },
      confidence: { type: 'number' }
    }
  }
}
```

When `confidence < 0.7`, automatically trigger AI Council deliberation with plant councilors.

### AI Council Plant Councilors (NEW)

Add to AI Council (from `~/.openclaw/workspace/ai-council-mcp/src/`):

```typescript
// plant-councilors.ts
export const plantCouncilors = [
  {
    id: 'hydroponics-expert',
    name: 'Hydroponics Guru',
    role: 'cultivation',
    expertise: 'hydroponic systems, nutrient delivery, root health',
    voice: 'professional'
  },
  {
    id: 'photoperiod-specialist',
    name: 'Light Master',
    role: 'cultivation',
    expertise: 'lighting schedules, photoperiod control, flowering triggers',
    voice: 'professional'
  },
  {
    id: 'integrated-pest-manager',
    name: 'IPM Specialist',
    role: 'cultivation',
    expertise: 'pest identification, organic controls, prevention',
    voice: 'professional'
  },
  {
    id: 'harvest-technician',
    name: 'Harvest Pro',
    role: 'cultivation',
    expertise: 'trichome monitoring, harvest timing, curing techniques',
    voice: 'professional'
  },
  {
    id: 'ph nutrient-architect',
    name: 'pH Ninja',
    role: 'cultivation',
    expertise: 'pH management, nutrient lockout, EC balancing',
    voice: 'professional'
  }
];
```

---

## E. ACP/Agent Mesh Integration

### CannaAI as Mesh Node

Register CannaAI as an agent mesh node at `http://localhost:3000`:

```json
// Mesh registration
{
  "agentId": "cannaai",
  "name": "CannaAI Grow Monitor",
  "capabilities": ["plant-analysis", "sensor-monitoring", "automation-control"],
  "endpoint": "http://localhost:3000",
  "meshPort": 4000
}
```

### Event Broadcasting

Grow events broadcast via mesh:

| Event | Action |
|-------|--------|
| `env.threshold.exceeded` | Alert → Duck CLI → Dashboard |
| `plant.health.declined` | Alert → AI Council → Analysis request |
| `automation.triggered` | Log → Dashboard update |
| `harvest.ready` | Notify → Telegram + Dashboard |

### Command Routing

Mesh commands → CannaAI actions:

```
"cannaai.set_environment temp=75 humidity=50" 
  → Mesh broadcast 
  → CannaAI automation endpoint
```

---

## F. Specific Files to Create/Modify

### 1. Duck CLI - CannaAI Command Module

**Create:** `duck-cli-src/src/commands/cannaai/`
```
cannaai/
├── index.ts           # Main command handler
├── analyze.ts         # Plant analysis
├── monitor.ts        # Environmental monitoring
├── strain.ts         # Strain lookup
├── alerts.ts         # Alert management
└── SKILL.md          # Duck CLI skill
```

### 2. Duck CLI - MCP Client

**Create:** `duck-cli-src/src/mcp/cannaai-mcp.ts`
- MCP client for CannaAI `/api/mcp`
- Handles tool calls, retries, fallbacks
- Connects to AI Council for deliberation

### 3. Update OpenClaw Skill

**Modify:** `/tmp/cannaai-inspect/openclaw-skill/SKILL.md`

Update for full integration:
```markdown
## AI Council Integration

When analyzing plants with confidence < 0.7, automatically delegate to AI Council:
- Trigger: plant-health-deliberation mode
- Councilors: hydroponics-expert, integrated-pest-manager, harvest-technician
- Output: Verdict with recommended actions

## Agent Mesh

CannaAI registers as mesh node for:
- Real-time environmental alerts
- Plant health notifications
- Automation status updates
```

### 4. Enhance OpenClaw Bridge

**Modify:** `/tmp/cannaai-inspect/openclaw-bridge/bridge-server.ts`

Add mesh integration:
```typescript
// Add after existing endpoints
app.post('/mesh/broadcast', (req, res) => {
  // Broadcast grow events to mesh
});
app.get('/mesh/status', (req, res) => {
  // Return mesh node status
});
```

### 5. AI Council - Add Plant Councilors

**Create:** `~/.openclaw/workspace/ai-council-mcp/src/plant-councilors.ts`
- 5 cannabis cultivation specialists
- Integrate into deliberation modes

### 6. Duck CLI - AI Council Integration

**Create:** `duck-cli-src/src/orchestrator/council-bridge.ts`
- Connect CannaAI analysis to AI Council
- Use plant councilors for complex decisions

---

## G. Consolidation Priority

### Phase 1: Core Integration (Do First)

**Goal:** Get CannaAI ↔ AI Council ↔ Duck CLI working together

| Priority | Task | Branch | Effort |
|----------|------|--------|--------|
| 1 | Merge `mcp-server` branch to master | mcp-server → master | Low |
| 2 | Create CannaAI CLI commands in Duck CLI | new | Medium |
| 3 | Add plant councilors to AI Council | new | Low |
| 4 | Wire CannaAI MCP → AI Council deliberation | new | Medium |

**Why:** These are the core integrations that enable the full workflow. MCP server and AI Council already exist.

### Phase 2: Branch Cleanup

**Goal:** Clean up the 13 bolt- and security branches

| Priority | Task | Notes |
|----------|------|-------|
| 5 | Merge `dev` → `master` | Has basic work |
| 6 | Audit bolt- branches | Check which have unique changes |
| 7 | Merge unique bolt- changes | Skip duplicates |
| 8 | Merge security fixes | Sentinel branches |
| 9 | Delete merged branches | Clean up |

**Why:** Prevent bitrot and conflicting changes.

### Phase 3: Advanced Features

**Goal:** Full mesh and autonomous evolution

| Priority | Task |
|----------|------|
| 10 | CannaAI as mesh node |
| 11 | AgentEvolver integration |
| 12 | Autonomous improvement loop |

---

## H. Immediate Action Items

### For Duck CLI (duckets' repo)

```bash
# 1. Create CannaAI command module
mkdir -p src/commands/cannaai
# Add analyze.ts, monitor.ts, strain.ts, alerts.ts

# 2. Create MCP client
# src/mcp/cannaai-mcp.ts

# 3. Wire in Go CLI
# cmd/duck/main.go - add cannaai subcommand
```

### For CannaAI (Franzferdinan51/CannaAI)

```bash
# 1. Ensure MCP endpoint works
curl http://localhost:3000/api/mcp -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# 2. Add plant councilors to AI Council
# Create ~/.openclaw/workspace/ai-council-mcp/src/plant-councilors.ts

# 3. Create bridge for AI Council deliberation
# src/lib/council-bridge.ts
```

### For AI Council

```bash
# 1. Add plant councilors
# src/plant-councilors.ts

# 2. Create plant-health-deliberation mode
# Add to deliberation modes
```

---

## I. Testing Plan

### Unit Tests
```bash
# Test CannaAI MCP
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"get_plants"}}'

# Test AI Council deliberation
curl -X POST http://localhost:3001/api/ask \
  -d '{"question":"What\'s wrong with my plant?","mode":"plant-health"}'

# Test Duck CLI commands
./duck cannaai status
./duck cannaai analyze /tmp/test-plant.jpg
```

### Integration Tests
```bash
# Full flow: analyze with council deliberation
./duck cannaai analyze /tmp/sick-plant.jpg --council

# Expected: CannaAI → low confidence → AI Council → verdict
```

---

## J. File Manifest

| File | Action | Location |
|------|--------|----------|
| `src/commands/cannaai/index.ts` | CREATE | duck-cli-src/ |
| `src/commands/cannaai/analyze.ts` | CREATE | duck-cli-src/ |
| `src/mcp/cannaai-mcp.ts` | CREATE | duck-cli-src/ |
| `src/orchestrator/council-bridge.ts` | CREATE | duck-cli-src/ |
| `cmd/duck/main.go` | MODIFY | duck-cli-src/ |
| `openclaw-skill/SKILL.md` | UPDATE | CannaAI/ |
| `openclaw-bridge/bridge-server.ts` | UPDATE | CannaAI/ |
| `ai-council-mcp/src/plant-councilors.ts` | CREATE | OpenClaw workspace/ |
| `ai-council-mcp/src/deliberation/modes/plant-health.ts` | CREATE | OpenClaw workspace/ |
| `integrations/grow-monitor-bridge.py` | ENHANCE | CannaAI/ |

---

## K. Rollback Plan

If integration fails:
1. Revert Duck CLI changes (git checkout)
2. CannaAI MCP endpoint remains standalone
3. AI Council continues to work independently
4. OpenClaw skill still provides basic plant analysis

---

*End of Consolidation Plan*