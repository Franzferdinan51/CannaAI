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

### 🧠 AI Assistant
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

## 🤖 OpenClaw Integration

CannaAI can be controlled by OpenClaw bots and AI agents via the OpenClaw gateway.

### Quick Start
```bash
# Check CannaAI status (from any machine on network)
curl http://localhost:3000/api/openclaw/status
```

### OpenClaw Skill
Copy `openclaw-skill/` to your OpenClaw skills directory to enable full CannaAI control:
- Full API documentation
- CLI tool for bot commands
- Agent-friendly endpoints

### API Endpoints
```
GET /api/openclaw/status  - Bot status check
GET /api/rooms           - List grow rooms
GET /api/plants          - List plants
GET /api/strains         - List strains
GET /api/sensors         - Get sensor readings
POST /api/analyze        - AI plant analysis
```

### Network Access
- Local: http://localhost:3000
- LAN: http://192.168.1.101:3000
- Tailscale: http://100.106.80.61:3000

## 🛠️ Technology Stack

### Hybrid Architecture (NEW)
CannaAI now uses a modern hybrid architecture with separate backend and frontend services:

**Backend (Next.js API Server)**
- Serves RESTful APIs and real-time Socket.IO connections
- Handles all business logic, AI processing, and data management
- Runs on port 3000

**Frontend (Vite + React)**
- Modern SPA built with Vite for optimal development experience
- Consumes backend APIs via a comprehensive integration layer
- Runs on port 5173 for development

### Backend API Server
- **Framework**: Next.js 15 with App Router and Custom Server
- **Language**: TypeScript 5 with flexible strictness
- **Database**: SQLite with Prisma ORM for type-safe operations
- **Real-time**: Socket.IO WebSocket integration on `/api/socketio`
- **Validation**: Zod schemas for runtime type checking
- **AI Integration**: Z-AI Web Dev SDK with LM Studio + OpenRouter support
- **File Processing**: HEIC image conversion, archive support

### Frontend SPA (New UI)
- **Framework**: React 19 with Vite for fast development
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with custom components
- **State Management**: Zustand for client state, TanStack Query for server state
- **HTTP Client**: Axios with interceptors and error handling
- **Real-time**: Socket.IO client integration
- **UI Components**: Modern component library with Radix UI primitives
- **Development Tools**: Hot Module Replacement, fast refresh

### Backend
- **Runtime**: Node.js 18+ with tsx TypeScript execution
- **Database**: SQLite with Prisma ORM for type-safe operations
- **Real-time**: Socket.IO WebSocket integration on `/api/socketio`
- **Validation**: Zod schemas for runtime type checking
- **AI Integration**: Z-AI Web Dev SDK with LM Studio + OpenRouter support
- **File Processing**: HEIC image conversion, archive support

### Development Tools
- **Hot Reload**: Nodemon with tsx for rapid development
- **Code Quality**: ESLint with flexible configuration
- **Build System**: Optimized Next.js builds with error tolerance
- **Type Safety**: TypeScript with relaxed strictness for flexibility

## 🚀 Getting Started

### Quick Start (Hybrid Architecture)

**Option 1: Start Both Services (Recommended)**
```bash
# Clone and setup
git clone https://github.com/Franzferdinan51/CannaAI.git
cd CannaAI

# Install all dependencies (backend + frontend)
npm run setup

# Initialize database
npm run db:generate
npm run db:push

# Start both backend and frontend simultaneously
npm run dev

# Access at:
# - Frontend (UI):  http://localhost:5173
# - Backend (API):  http://localhost:3000
```

**Option 2: Individual Services**
```bash
# Start only backend (API server)
npm run backend

# Start only frontend (in separate terminal)
npm run frontend

# Or check if ports are available first
npm run check:ports
```

**Option 3: Advanced Startup Script**
```bash
# Use the advanced startup script with health checks
npm run start:both

# Or with continuous health monitoring
npm run health -- --watch
```

### Prerequisites
- **Node.js**: 18+ (required for tsx execution)
- **npm**: 9+ (for dependency management)
- **Git**: For version control

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Franzferdinan51/CannaAI.git
   cd CannaAI
   ```

2. **Install all dependencies**
   ```bash
   # Install both backend and frontend dependencies
   npm run setup

   # Or install separately
   npm run setup:backend    # Backend dependencies only
   npm run setup:frontend   # Frontend dependencies only
   ```

3. **Set up environment variables** (Optional)
   ```bash
   cp .env.local.example .env.local
   ```

   Configure your AI services in `.env.local`:
   ```env
   # LM Studio (Local) - Optional
   LM_STUDIO_URL=http://localhost:1234

   # OpenRouter (Cloud) - Optional
   OPENROUTER_API_KEY=your-openrouter-api-key-here

   # Enable/Disable services
   ENABLE_OPENROUTER=false
   ```

4. **Initialize database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start development environment**

   **Full Hybrid Mode (Recommended):**
   ```bash
   npm run dev              # Start both backend and frontend
   npm run dev:full         # Alternative command
   ```

   **Individual Services:**
   ```bash
   # Backend only (API + Socket.IO)
   npm run backend          # Development mode
   npm run backend:prod     # Production mode

   # Frontend only (Vite SPA)
   npm run frontend         # Development mode
   npm run frontend:build   # Build for production
   ```

6. **Access the application**
   - **Frontend (UI)**: [http://localhost:5173](http://localhost:5173) - Main user interface
   - **Backend (API)**: [http://localhost:3000](http://localhost:3000) - API endpoints and Socket.IO
   - **Socket.IO**: `ws://localhost:3000/api/socketio` - Real-time communication

### Development Workflow

**1. Check Port Availability**
```bash
npm run check:ports         # Verify ports 3000 and 5173 are available
```

**2. Start Development Environment**
```bash
npm run dev                 # Start both services with hot reload
```

**3. Monitor Service Health**
```bash
npm run health              # One-time health check
npm run health -- --watch   # Continuous monitoring
```

**4. Build for Production**
```bash
npm run build:all           # Build both frontend and backend
npm run build:prod          # Production build command
```

### Port Configuration

- **Backend API Server**: Port 3000 (configurable via `PORT` environment variable)
- **Frontend Dev Server**: Port 5173 (Vite default, configurable via `--port`)
- **Socket.IO**: `/api/socketio` endpoint on backend port

If you need to use different ports:
```bash
# Backend on different port
PORT=3001 npm run backend

# Frontend on different port
cd NewUI/cannaai-pro && npm run dev -- --port 5174
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── analyze/       # Plant analysis endpoint
│   │   ├── chat/          # AI chat endpoint
│   │   ├── strains/       # Strain management
│   │   ├── history/       # Analysis history
│   │   ├── sensors/       # Sensor data & automation
│   │   ├── council/       # AI Council endpoints
│   │   ├── swarm-analyze/ # Multi-provider AI analysis
│   │   ├── rag-chat/      # RAG chat assistant
│   │   ├── canopy/        # Canopy Grow Manager features
│   │   └── storage/       # Document storage management
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── CouncilChamber.tsx # AI Council UI
│   ├── CanopyAnalytics.tsx # Canopy analytics dashboard
│   ├── BreedingLab.tsx    # Breeding lab UI
│   └── StrainGraph.tsx    # Strain lineage visualization
├── lib/
│   ├── db.ts              # Database configuration
│   ├── socket.ts          # Socket.io setup
│   ├── ocrService.ts      # OCR text extraction
│   ├── pdfProcessor.ts    # PDF document processing
│   ├── indexedDB.ts       # Browser-based storage
│   ├── ai/                # AI services
│   │   ├── councilService.ts           # Multi-agent deliberation
│   │   ├── adaptiveOrchestrationService.ts # Session optimization
│   │   ├── predictionMarketService.ts  # Forecasting & predictions
│   │   ├── councilMemoryService.ts      # Bot-specific memory
│   │   ├── sessionModesService.ts       # 14 session modes
│   │   ├── swarmCodingService.ts        # Code generation pipelines
│   │   ├── argumentationFrameworkService.ts # Structured debates
│   │   ├── vectorSearchService.ts       # Semantic search
│   │   ├── geminiService.ts             # Google Gemini integration
│   │   ├── lmstudioService.ts           # LM Studio integration
│   │   ├── openrouterService.ts         # OpenRouter integration
│   │   ├── swarmOrchestrator.ts         # Multi-provider AI swarm
│   │   ├── verificationPipeline.ts      # Dual-check verification
│   │   ├── ragChat.ts                   # RAG chat system
│   │   └── canopyService.ts             # Canopy features
│   └── utils.ts           # Utility functions
├── types/                 # TypeScript type definitions
│   ├── plant-analysis.ts  # Plant health types
│   ├── council.ts         # AI Council types
│   └── canopy.ts          # Canopy types
└── hooks/                 # Custom React hooks
```

## 🔧 Development Commands

### Hybrid Architecture Commands

**Service Management:**
```bash
npm run dev                  # Start both backend and frontend (recommended)
npm run dev:full             # Alternative command to start both services
npm run start:both           # Advanced startup with health checks
npm run start:dev            # Development mode with monitoring
npm run start:prod           # Production mode with monitoring

# Individual Services
npm run backend              # Start backend only (development)
npm run backend:prod         # Start backend only (production)
npm run frontend             # Start frontend only (development)
npm run frontend:build       # Build frontend for production
npm run frontend:preview     # Preview production build
```

**Health & Diagnostics:**
```bash
npm run check:ports          # Check if ports 3000/5173 are available
npm run health               # One-time service health check
npm run health -- --watch    # Continuous health monitoring
npm run health -- --verbose  # Detailed health diagnostics
```

**Setup & Dependencies:**
```bash
npm run setup                # Install all dependencies (backend + frontend)
npm run setup:backend        # Install backend dependencies only
npm run setup:frontend       # Install frontend dependencies only
npm run install:all          # Alternative setup command

# Cleanup & Reset
npm run clean                # Clean all node_modules and reinstall
npm run clean:backend        # Clean backend dependencies only
npm run clean:frontend       # Clean frontend dependencies only
```

### Core Development
```bash
npm run dev          # Start development server with hot reload (Unix)
npm run dev:win      # Start development server on Windows
npm run build        # Build production application
npm run start        # Start production server (Unix)
npm run start:win    # Start production server on Windows
npm run lint         # Run ESLint checks
```

### Database Operations
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes (no migration)
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database to initial state
```

### Build Commands
```bash
npm run build                # Build backend and frontend
npm run build:all           # Build both services (alias)
npm run build:backend       # Build backend only
npm run build:frontend      # Build frontend only
npm run build:static        # Build for static hosting (Netlify)
npm run build:netlify       # Alias for static build
npm run build:prod          # Production build command
```

### Static Build (for Netlify)
```bash
npm run build:static # Build for static hosting
npm run build:netlify # Alias for static build
```

### Startup Modes (Windows - startup.bat)

The `startup.bat` script provides comprehensive startup modes:

1. **Development Mode (Local)** - Standard dev server (127.0.0.1:3000)
2. **Production Mode (Local)** - Optimized build for local use
3. **Development + AgentEvolver** - Dev server + AI optimization dashboard (Port 8000)
4. **Production + AgentEvolver** - Full production with AI dashboard
5. **Install Dependencies Only** - npm install without starting server
6. **Reset Database & Start Dev Mode** - Reset DB and start dev mode
7. **AgentEvolver Server Only** - Python backend + UI only (Port 8000)
8. **Exit** - Clean shutdown

**Recommended Modes:**
- **Local Development**: Mode 1
- **With AI Optimization**: Mode 3
- **Production Deployment**: Mode 2 or 4

### AI Service Setup

#### LM Studio (Local AI)
1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a suitable model (e.g., Llama, Mistral)
3. Start server on default port 1234
4. Set `LM_STUDIO_URL=http://localhost:1234` in `.env.local`

#### OpenRouter (Cloud AI)
1. Sign up at [OpenRouter.ai](https://openrouter.ai/)
2. Get your API key from the dashboard
3. Set `OPENROUTER_API_KEY=your-key-here` in `.env.local`
4. Set `ENABLE_OPENROUTER=true` to enable

#### Google Gemini (Cloud AI)
1. Get API key from [Google AI Studio](https://ai.google.dev/)
2. Set `GEMINI_API_KEY=your-key-here` in `.env.local`
3. Select Gemini models (gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash)
4. Features: 1-2M token context window, vision support, FREE during preview

#### Anthropic Claude (Premium AI)
1. Sign up at [Anthropic](https://www.anthropic.com/)
2. Get API key from the console
3. Set `ANTHROPIC_API_KEY=your-key-here` in `.env.local`
4. Features: Advanced reasoning, 200k context window, vision support

#### Groq (Fast Inference)
1. Sign up at [Groq](https://groq.com/)
2. Get API key from the console
3. Set `GROQ_API_KEY=your-key-here` in `.env.local`
4. Features: Ultra-fast inference (10-100x faster), long context support

#### AgentEvolver (Self-Evolving AI)
1. Python 3.9+ required
2. Install dependencies: `cd agentevolver && install.sh` (or `install_new.bat` on Windows)
3. Start with CannaAI: Use startup.bat Mode 3 or 4
4. Standalone mode: Use startup.bat Mode 7
5. Access Dashboard at `http://localhost:8000`

**AgentEvolver Features:**
- **Dashboard UI**: Full visual interface for agent management
- `/optimize` - Optimize prompts for better AI responses
- `/metrics` - View performance statistics
- `/history` - Browse evolution history
- `/config` - Configure optimization settings
- `/feedback` - Submit result feedback

**Benefits:**
- Improved AI accuracy for cultivation questions
- Context-aware prompt enhancement
- Strain and symptom-specific optimizations
- Automatic fallback handling

## 🤖 AI Analysis Features

### Plant Health Analysis
The system provides comprehensive plant analysis through multiple AI approaches:

1. **Visual Symptom Analysis**: Upload images or describe symptoms
2. **Environmental Data Analysis**: Integrates sensor readings for diagnosis
3. **Purple Symptom Detection**: Advanced logic to distinguish:
   - **Genetic Purple**: Healthy purple strain characteristics
   - **Deficiency Purple**: Phosphorus deficiency symptoms

### Usage Examples

**Basic Analysis (Minimal Input)**:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Detailed Analysis**:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "strain": "Blue Dream",
    "leafSymptoms": "Purple leaves, yellowing, curling",
    "phLevel": "6.2",
    "temperature": 75,
    "humidity": 60,
    "medium": "Soil",
    "growthStage": "Flowering"
  }'
```


### Advanced Analysis Features

#### Trichome Analysis (Harvest Timing)
Microscopic analysis of plant trichomes to determine optimal harvest readiness.

**Supported Devices:**
- USB digital microscopes (60x-1000x magnification)
- Mobile phone camera with macro lens
- USB webcams with close-up capability

**Analysis Capabilities:**
- **Trichome Maturity Detection**: Identifies clear, cloudy, amber, and mixed stages
- **Harvest Readiness**: Calculates optimal harvest window based on trichome ratios
- **Density Analysis**: Measures trichome coverage and density
- **Quality Assessment**: Evaluates image sharpness, lighting, and magnification
- **Timing Recommendations**: Provides estimated days until optimal harvest

**Input Requirements:**
- Clear, well-lit microscope image (Base64 encoded)
- Device information (type, resolution, magnification level)
- Optional: Strain type, desired effect (energetic vs sedative)

**Output Provided:**
- Trichome distribution percentages (clear/cloudy/amber)
- Harvest readiness score (Not Ready / Almost Ready / Ready / Overripe)
- Estimated days until optimal harvest
- Confidence score for accuracy assessment
- Detailed findings with severity levels

**Usage:**
```bash
POST /api/trichome-analysis
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,...",
  "device": {
    "type": "usb_microscope",
    "resolution": "1920x1080",
    "magnification": 400
  },
  "strain": "Blue Dream",
  "desiredEffect": "balanced"
}
```

---

#### Live Vision Monitoring
Real-time plant health monitoring via webcam or microscope with intelligent change detection.

**Supported Devices:**
- Standard webcams
- USB microscopes
- IP cameras
- Mobile device cameras

**Analysis Capabilities:**
- **Real-Time Health Assessment**: Continuous monitoring of plant condition
- **Change Detection**: Identifies changes between analysis sessions
- **Multi-Focus Analysis**: Analyze specific areas (leaves, stems, roots, flowers)
- **Health Scoring**: Numerical health score with trend tracking
- **Urgency Levels**: Automatic priority assessment (low/medium/high/critical)
- **Context Tracking**: Maintains plant history for better analysis

**Input Requirements:**
- Live image capture (Base64 encoded)
- Device information (type, resolution)
- Plant context (strain, growth stage, medium, environment)
- Analysis options (focus area, urgency level)

**Output Provided:**
- Current health score and status
- Changes detected since last analysis
- Specific health issues identified
- Actionable recommendations
- Confidence score
- Historical comparison data

**Usage:**
```bash
POST /api/live-vision
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,...",
  "device": {
    "type": "webcam",
    "resolution": "1280x720"
  },
  "plantContext": {
    "strain": "Northern Lights",
    "growthStage": "Vegetative",
    "medium": "Soil",
    "environment": {
      "temperature": 24,
      "humidity": 60,
      "ph": 6.5
    }
  },
  "analysisOptions": {
    "focusArea": "leaves",
    "urgencyLevel": "standard"
  }
}
```

**Key Features:**
- Captures timestamp for each analysis
- Detects subtle changes over time
- Provides trend analysis
- Integrates with sensor data for comprehensive assessment
- Supports multiple plants with individual tracking

## 🔧 Environment Variables - Complete Reference

### Core Server Configuration
```env
# Server Binding
PORT=3000                        # Server port (default: 3000)
HOST=127.0.0.1                   # Bind address (use 0.0.0.0 for network access)

# Node Environment
NODE_ENV=development             # Environment: development | production

# Build Configuration
BUILD_MODE=server                # Build mode: server | static (for Netlify)
```

### AI Provider Configuration
```env
# LM Studio (Local AI)
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_TIMEOUT=30000          # Connection timeout (ms)

# OpenRouter (Cloud AI)
OPENROUTER_API_KEY=your-api-key-here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
OPENROUTER_TIMEOUT=60000         # Request timeout (ms)
OPENROUTER_MAX_TOKENS=4096       # Max response tokens
OPENROUTER_TEMPERATURE=0.7       # Response creativity (0.0-2.0)
ENABLE_OPENROUTER=false          # Enable/disable OpenRouter

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_TIMEOUT=60000

# Anthropic Claude
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_TIMEOUT=60000

# Groq (Fast Inference)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT=30000

# Fallback AI Configuration
ENABLE_FALLBACK=true             # Enable rule-based fallback
FALLBACK_CONFIDENCE=0.6          # Confidence threshold for fallback
```

### Database Configuration
```env
DATABASE_URL="file:./db/custom.db"    # SQLite database path
```

### Socket.IO Configuration
```env
SOCKET_IO_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SOCKET_IO_AUTH=false             # Enable WebSocket authentication (development: false)
```

### Debug & Development
```env
DEBUG_AI_PROVIDERS=false         # Enable AI provider debug logging
DEBUG=*                          # Enable all debug logging (verbose)
```

---

### Configuration by Environment

**Local Development:**
```env
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
LM_STUDIO_URL=http://localhost:1234
ENABLE_OPENROUTER=false
SOCKET_IO_AUTH=false
```

**Remote Development (Network Access):**
```env
NODE_ENV=development
HOST=0.0.0.0                     # Allow network access
PORT=3000
SOCKET_IO_ORIGINS=http://localhost:3000,http://*:3000
```

**Production (Server):**
```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
ENABLE_OPENROUTER=true
OPENROUTER_API_KEY=your-production-key
SOCKET_IO_AUTH=true              # Enable authentication
```

**Static Export (Netlify):**
```env
BUILD_MODE=static                # Enable static export mode
ENABLE_OPENROUTER=true
```

---

### AI Model Configuration
- **Local Models**: Supports any model loaded in LM Studio
- **Cloud Models**:
  - **Google Gemini**: 1-2M token context window, vision support, FREE during preview
  - **Anthropic Claude**: Advanced reasoning capabilities, 200k context window
  - **Groq**: Ultra-fast inference (10-100x faster than standard APIs)
  - **OpenRouter**: Access to multiple models (Claude, GPT, Llama, etc.)
  - **OpenAI-compatible**: Any OpenAI-compatible endpoint
- **Fallback System**: Rule-based analysis when AI services unavailable

## 🚨 Advanced Features

### Purple Symptom Detection Logic
The system includes sophisticated logic to distinguish between:

1. **Genetic Purple Strains** (Healthy):
   - Uniform purple coloration
   - No accompanying symptoms
   - Normal plant vigor and growth

2. **Phosphorus Deficiency** (Unhealthy):
   - Purple on leaves (not just stems)
   - Accompanied by yellowing, curling, or wilting
   - Poor growth or other symptoms present

### Multi-Room Management
- Individual sensor tracking per room
- Room-specific automation schedules
- Comparative analytics between rooms
- Zone-based environmental control

### Expert System Integration
- Cultivation best practices encoded in rules
- Growth stage-specific recommendations
- Strain-specific guidance database
- Treatment protocol repository

## 📱 Features Overview

### 1. Plant Health Scanner
- Upload images of plant leaves
- AI-powered deficiency detection
- Purple strain coloration analysis
- Detailed treatment recommendations

### 2. Live Sensor Monitoring
- Real-time environmental data
- Color-coded status indicators
- Historical trend visualization
- Automated alert system

### 3. Automation Center
- Smart watering schedules
- Climate control systems
- Lighting automation
- Remote room management

### 4. Analytics & Insights
- Growth progression tracking
- Yield optimization metrics
- Environmental efficiency analysis
- AI-powered recommendations

### 5. Strain Management
- Custom strain profiles
- Optimal condition storage
- Deficiency tracking
- Purple strain support

## 🎯 Usage Guide

### Performing Plant Analysis
1. Navigate to the **Overview** tab
2. Upload a clear image of affected leaves
3. Fill in the analysis form with strain and symptoms
4. Click **Advanced Analysis** for AI diagnosis
5. Review detailed results and treatment recommendations

### Setting Up Automation
1. Go to the **Automation** tab
2. Configure watering thresholds and schedules
3. Set climate control ranges
4. Enable automation for each system
5. Monitor real-time adjustments

### Managing Strains
1. Click the **+** button in the strain selector
2. Fill in strain details and optimal conditions
3. Mark purple strains for special analysis
4. Save strain profile for future use

### Using AI Assistant
1. Click the **AI Assistant** button in the header
2. Ask questions about plant care, nutrients, or environment
3. Receive context-aware advice based on current sensor data
4. Follow recommendations for optimal results

### Business Management Features

#### Harvest Tracking
1. Navigate to the **Analytics** tab → **Harvest** section
2. Record harvest details:
   - Harvest date and strain
   - Wet weight and dry weight
   - Quality grade (A, A+, B, etc.)
   - THC/CBD percentages
   - Flowering time duration
   - Terpene profile notes
3. View statistics:
   - Total harvested amount
   - Average yield per plant
   - Average THC/CBD levels
   - Best performing strains

#### Inventory Management
1. Go to **Settings** → **Inventory**
2. Add items by category:
   - Nutrients (N-P-K values, quantity, cost)
   - Equipment (tools, lights, fans, etc.)
   - Growing medium (soil, coco, hydro supplies)
3. Set low stock alerts
4. Track restock dates
5. Monitor total inventory value

#### Clone & Propagation Tracking
1. Navigate to **Cloning** section
2. Create clone batch:
   - Mother plant strain
   - Number of clones
   - Rooting method (aerocloner, rockwool, water, soil)
   - Rooting hormone used
   - Expected root date
3. Update clone status as they develop
4. Track success rates by method and strain
5. View overall propagation statistics

#### Cost & Profitability Analysis
1. Go to **Analytics** → **Costs**
2. Log expenses by category:
   - Nutrients and amendments
   - Equipment purchases
   - Utilities (electricity, water)
   - Miscellaneous supplies
3. Record revenue from harvests
4. View automatic calculations:
   - Total profit/loss
   - Profit margin percentage
   - Cost per gram produced
   - Category expense breakdown
   - ROI analysis

## 🔌 Complete API Reference

### System Health & Version
```bash
GET /api/health          # System health check
GET /api/version         # API version information
```

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-20T10:30:00Z",
  "version": "1.0.0"
}
```

---

### Plant Analysis Endpoints

#### Manual Plant Health Analysis
```bash
POST /api/analyze
Content-Type: application/json
```

**Request Body:**
```json
{
  "strain": "Blue Dream",
  "leafSymptoms": "Purple leaves, yellowing, curling",
  "phLevel": "6.2",
  "temperature": 75,
  "humidity": 60,
  "medium": "Soil",
  "growthStage": "Flowering",
  "plantImage": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "diagnosis": "Phosphorus deficiency detected",
  "confidence": 0.92,
  "recommendations": ["Increase P nutrients", "Check pH levels"],
  "severity": "moderate",
  "findings": [
    {
      "type": "nutrient_deficiency",
      "name": "Phosphorus Deficiency",
      "confidence": 0.92
    }
  ]
}
```

#### Automatic Sensor-Based Analysis
```bash
POST /api/auto-analyze
Content-Type: application/json
```

**Request Body:**
```json
{
  "roomId": "room1",
  "sensorData": {
    "temperature": 75,
    "humidity": 60,
    "ph": 6.2,
    "ec": 1.8
  }
}
```

#### Analysis History
```bash
GET /api/history         # Get all analysis history
POST /api/history        # Save analysis to history
```

**History Response:**
```json
{
  "analyses": [
    {
      "id": "123",
      "timestamp": "2025-11-20T10:00:00Z",
      "strain": "Blue Dream",
      "diagnosis": "Phosphorus deficiency",
      "recommendations": ["..."]
    }
  ]
}
```

---

### Advanced Analysis Endpoints

#### Trichome Analysis (Harvest Timing)
```bash
POST /api/trichome-analysis
Content-Type: application/json
```

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "device": {
    "type": "usb_microscope",
    "resolution": "1920x1080",
    "magnification": 400
  },
  "strain": "Blue Dream",
  "desiredEffect": "balanced"
}
```

**Response:**
```json
{
  "trichomeDistribution": {
    "clear": 10,
    "cloudy": 70,
    "amber": 20
  },
  "harvestReadiness": "Ready",
  "estimatedDaysUntilHarvest": 0,
  "confidence": 0.88,
  "recommendations": ["Harvest within 3-5 days for balanced effect"]
}
```

#### Live Vision Monitoring
```bash
POST /api/live-vision
Content-Type: application/json
```

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "device": {
    "type": "webcam",
    "resolution": "1280x720"
  },
  "plantContext": {
    "strain": "Northern Lights",
    "growthStage": "Vegetative",
    "medium": "Soil",
    "environment": {
      "temperature": 24,
      "humidity": 60,
      "ph": 6.5
    }
  },
  "analysisOptions": {
    "focusArea": "leaves",
    "urgencyLevel": "standard"
  }
}
```

**Response:**
```json
{
  "healthScore": 85,
  "status": "Healthy",
  "changes": ["New growth detected", "Leaf color improved"],
  "issues": [],
  "recommendations": ["Continue current regimen"],
  "confidence": 0.91
}
```

---

### AI Services

#### AI Cultivation Assistant
```bash
POST /api/chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Why are my leaves turning yellow?",
  "model": "lm-studio",
  "sensorData": {
    "temperature": 22.5,
    "humidity": 55,
    "ph": 6.2
  }
}
```

**Response:**
```json
{
  "response": "Yellowing leaves can indicate nitrogen deficiency...",
  "model": "lm-studio",
  "confidence": 0.87
}
```

#### AI Providers Management
```bash
GET /api/ai/providers          # List available AI providers & models
POST /api/ai/providers         # Test provider connection
```

**Test Connection Request:**
```json
{
  "action": "test",
  "provider": "openrouter",
  "apiKey": "your-api-key"
}
```

---

### LM Studio Integration

#### Direct LM Studio Operations
```bash
POST /api/lmstudio              # Direct LM Studio API calls
GET /api/lmstudio/models        # List available LM Studio models
POST /api/lmstudio/chat         # Direct LM Studio chat endpoint
```

**LM Studio Chat:**
```json
POST /api/lmstudio/chat
{
  "model": "llama-2-7b",
  "messages": [
    {"role": "user", "content": "How do I fix nutrient burn?"}
  ]
}
```

---

### Business Management

#### Harvest Tracking
```bash
GET /api/harvest                # Get harvest history
POST /api/harvest               # Record new harvest
```

**Record Harvest:**
```json
{
  "strain": "Blue Dream",
  "harvestDate": "2025-11-20",
  "wetWeight": 1200,
  "dryWeight": 300,
  "thcPercentage": 22.5,
  "cbdPercentage": 0.8,
  "qualityGrade": "A+",
  "floweringTime": 63
}
```

#### Inventory Management
```bash
GET /api/inventory              # Get inventory items
POST /api/inventory             # Add/update inventory item
```

**Add Inventory:**
```json
{
  "category": "nutrients",
  "name": "CalMag Plus",
  "quantity": 5,
  "unit": "bottles",
  "cost": 15.99,
  "lowStockAlert": 2
}
```

#### Cloning & Propagation
```bash
GET /api/cloning                # Get clone batches
POST /api/cloning               # Create/update clone batch
```

**Create Clone Batch:**
```json
{
  "strain": "Northern Lights",
  "numberOfClones": 12,
  "rootingMethod": "aerocloner",
  "rootingHormone": "Clonex Gel",
  "startDate": "2025-11-20",
  "expectedRootDate": "2025-12-04"
}
```

#### Cost & Revenue Tracking
```bash
GET /api/costs                  # Get expense/revenue data
POST /api/costs                 # Log expense or revenue
```

**Log Expense:**
```json
{
  "type": "expense",
  "category": "nutrients",
  "amount": 45.99,
  "description": "Advanced Nutrients pH Perfect Trio",
  "date": "2025-11-20"
}
```

**Log Revenue:**
```json
{
  "type": "revenue",
  "amount": 800,
  "description": "100g Blue Dream harvest sale",
  "date": "2025-11-20"
}
```

---

### Cultivation Management

#### Strain Management
```bash
GET /api/strains          # Get all strains
POST /api/strains         # Create new strain
PUT /api/strains          # Update existing strain
DELETE /api/strains?id=x  # Delete strain
```

**Create Strain:**
```json
{
  "name": "Blue Dream",
  "type": "Hybrid",
  "isPurpleStrain": false,
  "optimalPH": 6.2,
  "optimalTemp": 75,
  "optimalHumidity": 60,
  "commonDeficiencies": ["nitrogen", "phosphorus"],
  "notes": "High yielding, easy to grow"
}
```

#### Sensor Data & Automation
```bash
GET /api/sensors                # Get current sensor data
POST /api/sensors               # Control automation systems
```

**Sensor Response:**
```json
{
  "room1": {
    "temperature": 75.2,
    "humidity": 58,
    "ph": 6.3,
    "ec": 1.8,
    "soilMoisture": 65,
    "lightIntensity": 850,
    "co2": 1200,
    "vpd": 1.2
  }
}
```

**Control Automation:**
```json
{
  "action": "start_watering",
  "room": "room1",
  "duration": 300
}
```

---

### Application Settings

#### Settings Management
```bash
GET /api/settings               # Get application settings
POST /api/settings              # Update settings
```

**Settings Actions:**
```json
// Get provider models
{
  "action": "get_provider_models",
  "provider": "openrouter"
}

// Update provider
{
  "action": "update_provider",
  "provider": "gemini",
  "apiKey": "your-api-key",
  "model": "gemini-2.0-flash-exp"
}

// Test connection
{
  "action": "test_connection",
  "provider": "anthropic",
  "apiKey": "your-api-key"
}

// AgentEvolver configuration
{
  "action": "get_agentevolver_config"
}

{
  "action": "update_agentevolver_config",
  "enabled": true,
  "apiUrl": "http://localhost:8001",
  "optimizationLevel": "advanced"
}
```

---

### Debug Tools (Development)

```bash
GET /api/debug/lmstudio-scan    # Scan for LM Studio models
GET /api/debug/models-test      # Test all AI model connections
```

---

### AI Council Endpoints (NEW)

#### Run Council Session
```bash
POST /api/council
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "run-session",
  "topic": "Should I add CO2 to my grow room?",
  "mode": "deliberation",
  "personaIds": ["master-grower", "horticulturist", "business-advisor"],
  "apiKey": "your-gemini-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "mode": "deliberation",
    "topic": "Should I add CO2 to my grow room?",
    "status": "completed",
    "participants": ["master-grower", "horticulturist", "business-advisor"],
    "messages": [
      {
        "id": "msg-uuid",
        "personaId": "master-grower",
        "personaName": "Dr. Sylvia Green",
        "content": "CO2 enrichment can significantly increase yields...",
        "timestamp": "2025-12-25T10:00:00Z"
      }
    ],
    "votes": {
      "agree": 8.5,
      "disagree": 0,
      "abstain": 1.0,
      "totalWeightedScore": 8.5,
      "consensus": "strong-agree"
    }
  }
}
```

#### Create Prediction Market
```bash
POST /api/council
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "create-prediction-market",
  "question": "What will be the final yield per plant?",
  "category": "yield",
  "context": "Blue Dream, 600W LED, 5x5 tent, soil grow",
  "participantIds": ["master-grower", "horticulturist"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "market-uuid",
    "question": "What will be the final yield per plant?",
    "category": "yield",
    "predictions": [
      {
        "id": "pred-uuid",
        "botId": "master-grower",
        "botName": "Dr. Sylvia Green",
        "predictedOutcome": "450-500 grams",
        "confidence": 0.85,
        "reasoning": "Based on strain, lighting, and setup..."
      }
    ],
    "consensus": {
      "consensusOutcome": "475 grams",
      "avgConfidence": 0.82,
      "confidenceInterval": {"min": 0.75, "max": 0.90}
    }
  }
}
```

#### Execute Swarm Coding Pipeline
```bash
POST /api/council
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "execute-swarm-pipeline",
  "task": "Create an automated nutrient dosing script",
  "pipelineType": "12-phase",
  "participantIds": ["tech-expert", "master-grower"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pipeline-uuid",
    "task": "Create an automated nutrient dosing script",
    "status": "completed",
    "phases": [
      {
        "id": "phase-1",
        "name": "Requirements Analysis",
        "status": "completed",
        "output": "The script should..."
      }
    ]
  }
}
```

#### Semantic Search
```bash
POST /api/council
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "semantic-search",
  "query": "nutrient deficiency yellow leaves",
  "options": {
    "limit": 10,
    "threshold": 0.3,
    "categoryFilter": "council-message"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "document": {
        "id": "doc-uuid",
        "content": "Nitrogen deficiency causes yellowing of lower leaves...",
        "metadata": {
          "sessionId": "session-uuid",
          "personaId": "botanist",
          "category": "council-message",
          "tags": ["nutrients", "deficiency"]
        }
      },
      "similarity": 0.87,
      "highlight": "Nitrogen deficiency causes yellowing of lower leaves"
    }
  ]
}
```

#### Available Council Actions
```json
{
  "actions": [
    "run-session",
    "execute-mode",
    "get-personas",
    "get-persona",
    "recommend-personas",
    "get-modes",
    "suggest-mode",
    "get-mode-description",
    "get-memories",
    "search-memories",
    "get-memory-stats",
    "create-prediction-market",
    "close-prediction-market",
    "suggest-prediction-questions",
    "get-prediction-stats",
    "create-swarm-pipeline",
    "execute-swarm-pipeline",
    "generate-code-package",
    "review-pipeline",
    "suggest-automation-tasks",
    "extract-arguments",
    "evaluate-argument",
    "find-counter-arguments",
    "synthesize-arguments",
    "build-argument-map",
    "add-document",
    "semantic-search",
    "smart-query",
    "delete-documents",
    "get-vector-stats",
    "calculate-metrics",
    "analyze-and-optimize",
    "generate-optimization-report",
    "get-optimization-suggestions"
  ]
}
```

---

### Canopy Grow Manager Endpoints (NEW)

#### Scan Inventory Item
```bash
POST /api/canopy
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "scan",
  "image": "data:image/jpeg;base64,...",
  "mode": "nutrient",
  "apiKey": "your-gemini-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "CalMag Plus",
    "brand": "Advanced Nutrients",
    "npk": "2-0-0",
    "type": "Additive/Booster"
  }
}
```

#### Analyze Genetics
```bash
POST /api/canopy
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "analyze-genetics",
  "targetStrain": {
    "id": "strain-1",
    "name": "Blue Dream",
    "breeder": "DJ Short"
  },
  "inventory": [
    {"id": "strain-2", "name": "Northern Lights", "type": "Indica"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "strainName": "Blue Dream",
    "parents": [
      {"name": "Blueberry", "type": "Indica"},
      {"name": "Haze", "type": "Sativa"}
    ],
    "recommendations": [
      {
        "partnerId": "strain-2",
        "partnerName": "Northern Lights",
        "projectedName": "Blue Dreamer",
        "synergyAnalysis": "Crossing with Northern Lights...",
        "dominantTerpenes": ["Myrcene", "Caryophyllene"],
        "potentialPhenotypes": [
          {
            "name": "Indica Pheno",
            "description": "Shorter, bushier plants with..."
          }
        ]
      }
    ]
  }
}
```

#### Fetch Cannabis News
```bash
POST /api/canopy
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "news",
  "category": "Legislation"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "headline": "Federal Legalization Bill Introduced",
      "summary": "New legislation proposed...",
      "source": "Cannabis Industry Journal",
      "date": "2025-12-25",
      "url": "https://..."
    }
  ]
}
```

---

## 🔧 API Authentication & Rate Limiting

### Current Implementation
- **Authentication**: Optional (configurable via SOCKET_IO_AUTH)
- **Rate Limiting**: Implemented for abuse prevention
- **CORS**: Configured for local and remote access
- **Input Validation**: Zod schemas for all endpoints
- **Error Handling**: Comprehensive error responses

### Future Enhancements
- User authentication system
- API key management
- Role-based access control
- Enhanced rate limiting per endpoint
- WebSocket authentication tokens

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2025-11-20T10:30:00Z"
}
```

## 🎨 Customization

### Adding New Components
1. Create component in `src/components/`
2. Follow shadcn/ui patterns
3. Use Tailwind CSS classes
4. Import in main page as needed

### Modifying AI Prompts
Edit prompts in API route files:
- `/api/analyze/route.ts` - Plant analysis prompts
- `/api/chat/route.ts` - Chat assistant prompts

### Custom Sensor Integration
1. Update sensor data structure in `/api/sensors/route.ts`
2. Add new sensor cards to main dashboard
3. Implement real-time updates via WebSocket

## 🚀 Deployment Options

### Deployment Mode Comparison

| Feature | Server Mode | Static Export (Netlify) |
|---------|------------|------------------------|
| **Build Command** | `npm run build` | `npm run build:netlify` |
| **Output** | `.next/` directory | `out/` directory |
| **API Routes** | ✅ Full support | ❌ Client-side only |
| **Database** | ✅ SQLite support | ❌ Browser storage only |
| **Socket.IO** | ✅ Real-time WebSocket | ❌ Not available |
| **AI Providers** | ✅ All 7 providers | ⚠️ Client-side APIs only |
| **Best For** | Full-featured apps | Static hosting, demos |

---

### 1. Local Development Server

**Quick Start:**
```bash
# Windows
startup.bat
# Select Mode 1 (Development) or Mode 2 (Development + AgentEvolver)

# Other platforms
npm run dev
```

**Features:**
- Hot reload with nodemon
- Full API and database support
- Socket.IO real-time features
- AgentEvolver integration (Mode 2)

---

### 2. Production Server (VPS, Cloud, Docker)

**Build & Deploy:**
```bash
# Build production
npm run build

# Start production server
npm run start           # Unix/Linux
npm run start:win       # Windows

# Or use startup.bat Mode 3 (Production)
```

**Environment Requirements:**
- Node.js 18+
- SQLite support
- Port 3000 available (configurable)
- Optional: Python 3.8+ for AgentEvolver

**Recommended Platforms:**
- **VPS**: DigitalOcean, Vultr, Linode
- **Cloud**: AWS EC2, Google Compute Engine, Azure VM
- **Container**: Docker, Kubernetes, Podman
- **PaaS**: Railway, Render, Fly.io

---

### 3. Netlify Static Hosting

**Automatic Deployment:**
1. Push code to GitHub repository
2. Connect repository to Netlify
3. Netlify automatically builds with `npm run build:netlify`
4. Site deploys to `out/` directory

**Manual Build:**
```bash
npm run build:netlify
# Upload out/ directory to Netlify
```

**Limitations:**
- No server-side API routes
- No database support
- Client-side AI API calls only
- Limited to OpenRouter, Gemini, Groq (browser-compatible)

**Configuration:**
- AI providers configured in-app (client-side)
- Demo mode with fallback analysis
- Optimal for showcasing features

---

### 4. Remote Access Setup (Tailscale, LAN)

For network or remote access from other devices:

**Using startup.bat Mode 7:**
```bash
startup.bat
# Select Mode 7 (Remote Development Mode)
# Server binds to 0.0.0.0:3000
```

**Manual Setup:**
```bash
# Set environment
set HOST=0.0.0.0
npm run dev
```

**Access URLs:**
- **Local**: http://localhost:3000
- **LAN**: http://[your-local-ip]:3000
- **Tailscale**: http://[tailscale-hostname]:3000

**Firewall Configuration:**
- Allow TCP port 3000 inbound
- Windows: `netsh advfirewall firewall add rule name="CannaAI" dir=in action=allow protocol=TCP localport=3000`

**Security Note:** Only use `HOST=0.0.0.0` on trusted networks or with proper authentication enabled.

---

## 🐳 Docker Support (Coming Soon)

Docker containerization is planned for future releases to simplify deployment:
- Pre-configured environment
- Multi-platform support (AMD64, ARM64)
- AgentEvolver integration
- One-command deployment

## 🐛 Troubleshooting

### Common Issues

**Port Conflicts**:
```bash
# Find processes using ports
netstat -ano | findstr :3000
# Kill processes
taskkill /PID [number] /F
```

**Database Issues**:
```bash
# Reset database
npm run db:reset
# Regenerate client
npm run db:generate
```

**AI Service Issues**:
- Check LM Studio is running on port 1234
- Verify OpenRouter API key is valid
- Check network connectivity
- Review environment variables

**Netlify-Specific Issues**:
- **AI Configuration**: Use the "AI Config" button to set up providers
- **CORS Errors**: Make sure OpenRouter allows your domain
- **Build Failures**: Check that submodules are properly removed
- **API Timeouts**: Increase timeout in OpenRouter configuration
- **Local Development**: Test with fallback mode first

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev
```

## 🔒 Security Considerations

### Current Implementation
- Input validation and sanitization
- API rate limiting
- CORS configuration
- Environment variable protection
- WebSocket authentication options

### Recommendations
- Add user authentication system
- Implement role-based access control
- Secure API key management
- Regular security updates
- Network security best practices

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit pull request

### Code Style
- TypeScript with flexible strictness
- Descriptive variable and function names
- Component-based architecture
- Comprehensive error handling
- Responsive design principles

## 📄 License

This project is proprietary software. All rights reserved.

## ⚠️ Disclaimer

CannaAI is designed for educational and informational purposes only. Always comply with local laws and regulations regarding cannabis cultivation. The AI recommendations should be used as guidance and not as a substitute for professional agricultural advice.

## 🆘 Support

For support and questions:
- Check this README first
- Review error logs in console
- Test API endpoints individually
- Verify environment configuration
- Check AI service status

---

## 📊 Project Statistics

- **Framework**: Next.js 15.3.5 with React 19 and Custom Server
- **Type Safety**: TypeScript 5 with flexible configuration
- **UI Components**: 50+ shadcn/ui Radix-based primitives
- **Backend**: Custom Node.js server with Socket.IO integration
- **Database**: SQLite with Prisma ORM
- **AI Integration**: Z-AI Web Dev SDK + 7 provider support
- **Real-time**: Socket.IO WebSocket (bidirectional communication)
- **Code Quality**: ESLint with relaxed rules for rapid development
- **Build System**: Optimized for both server and static deployment
- **Lines of Code**: 26,000+ (main dashboard), 70,000+ total
- **API Endpoints**: 50+ RESTful endpoints for comprehensive control
- **Supported AI Providers**: 7 (LM Studio, Google Gemini, Anthropic Claude, Groq, OpenRouter, OpenAI-compatible, Fallback)
- **Startup Modes**: 9 different modes via startup.bat (Windows)
- **Image Formats**: HEIC, JPEG, PNG, WebP with automatic conversion
- **Deployment Options**: Traditional server, static export (Netlify), remote access
- **AgentEvolver**: Self-evolving AI backend with 1000-record evolution history
- **Business Features**: Harvest tracking, inventory management, clone tracking, cost analysis
- **Advanced Analysis**: Trichome microscopy, live vision monitoring, purple strain intelligence
- **AI Council System**: 8 specialized personas, 14 session modes, prediction markets, swarm coding
- **Canopy Integration**: Breeding lab, strain library, analytics dashboard, usage logging
- **NexusDocs Features**: Multi-provider AI swarm, OCR, PDF processing, RAG chat, entity graphs

## 🏆 Key Achievements

### Core Features
- ✅ **7 AI Provider Support**: LM Studio (local), Google Gemini, Anthropic Claude, Groq, OpenRouter, OpenAI-compatible, and intelligent fallback system
- ✅ **AgentEvolver Integration**: Self-evolving AI system with cannabis domain expertise and continuous learning
- ✅ **Advanced Analysis Suite**: Trichome microscopy, live vision monitoring, and purple strain intelligence
- ✅ **Business Management**: Complete harvest tracking, inventory management, clone tracking, and profitability analysis
- ✅ **Real-time Monitoring**: WebSocket integration for live sensor data, environmental alerts, and automation control
- ✅ **AI Council Chamber**: Multi-agent deliberation system with 8 specialized cultivation expert personas
- ✅ **Prediction Markets**: AI-powered forecasting for yields, harvest timing, and potency with confidence intervals
- ✅ **Swarm Coding**: Multi-phase code generation pipelines (6/12/24 phases) for automation scripts
- ✅ **Vector Search**: Semantic search across all council discussions, memories, and documents
- ✅ **Bot-Specific Memory**: Each AI persona retains information for 30 days with automatic expiration
- ✅ **Adaptive Orchestration**: Real-time session optimization based on performance metrics and consensus rates
- ✅ **Canopy Grow Manager**: Breeding lab with genetic analysis, strain library with lineage visualization, analytics dashboard
- ✅ **Multi-Provider AI Swarm**: Consensus and distributed modes with dual-check verification
- ✅ **RAG Chat System**: Context-aware AI assistant with document archives and retrieval
- ✅ **OCR & Document Processing**: Tesseract.js integration for nutrient label and meter reading extraction

### Development & Deployment
- ✅ **Node.js v22 Compatibility**: Full support for latest Node.js with optimized build system
- ✅ **Dual Deployment Modes**: Traditional server deployment AND static hosting (Netlify)
- ✅ **9 Startup Modes**: Flexible startup options for development, production, remote access, and AI backend
- ✅ **Cross-Platform**: Windows and Unix development environments with platform-specific scripts
- ✅ **Remote Access**: Network-accessible mode with Tailscale and LAN support

### AI & Automation
- ✅ **Intelligent Prompt Optimization**: AgentEvolver automatically enhances AI prompts for better results
- ✅ **Multi-Model Fallback**: Automatic failover between 7 AI providers with rule-based fallback
- ✅ **Context-Aware Analysis**: Strain-specific, symptom-specific, and environment-aware AI responses
- ✅ **Harvest Timing Precision**: Microscopic trichome analysis for optimal harvest windows
- ✅ **Live Change Detection**: Real-time monitoring with intelligent change detection between analyses

### Production Ready
- ✅ **Comprehensive API**: 19 RESTful endpoints covering all cultivation and business management needs
- ✅ **Error Tolerance**: Relaxed TypeScript/ESLint for rapid iteration and flexibility
- ✅ **Performance Optimized**: Fast builds, efficient hot reload, optimized production bundles
- ✅ **Scalable Architecture**: Component-based design ready for feature expansion
- ✅ **Professional Documentation**: Comprehensive README, setup guides, and API reference

---

**Built with ❤️ for cannabis cultivation professionals**

---

## 💰 Support Development

If you find CannaAI useful, consider supporting development:

**Bitcoin:** `bc1q733czwuelntfug8jgur6md2lhzcx7l5ufks9y7`

---

**Repository**: [github.com/Franzferdinan51/CannaAI](https://github.com/Franzferdinan51/CannaAI)
