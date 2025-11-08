# CannaAI - Cannabis Cultivation Management System
(Some Features Still in Development)

An advanced AI-powered cannabis cultivation management system built with Next.js 15, featuring real-time plant health analysis, sensor monitoring, automation controls, and comprehensive cultivation analytics.

## 🌟 Features

### 🤖 AI-Powered Plant Analysis
- **Smart Symptom Detection**: Advanced analysis of plant health issues including nutrient deficiencies, pests, and diseases
- **Purple Strain Intelligence**: Accurately distinguishes between genetic purple strains and phosphorus deficiency symptoms
- **Flexible Input System**: Works with minimal user input - no strain information required
- **Multi-Model Support**: Integrates LM Studio (local) and OpenRouter (cloud) AI services with intelligent fallback

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
- **Multiple AI Models**: Support for LM Studio, OpenRouter, and custom models

### 🗃️ Strain Management
- **Custom Strain Database**: Add and manage your own strain profiles
- **Optimal Conditions**: Store and recall strain-specific environmental parameters
- **Deficiency Tracking**: Monitor common issues per strain
- **Purple Strain Support**: Special handling for anthocyanin-producing varieties

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui
- **Animations**: Framer Motion
- **Charts**: Recharts
- **State**: Zustand, TanStack Query

### Backend
- **Runtime**: Node.js 18+
- **Database**: SQLite with Prisma ORM
- **Real-time**: Socket.IO WebSocket
- **Validation**: Zod schemas
- **AI**: LM Studio + OpenRouter integration

### Development Tools
- **TypeScript**: tsx for execution
- **Hot Reload**: nodemon for development
- **Linting**: ESLint (flexible configuration)
- **Building**: Next.js optimized builds

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CannaAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Configure your AI services in `.env.local`:
   ```env
   # LM Studio (Local) - Optional
   LM_STUDIO_URL=http://localhost:1234

   # Open Router (Cloud) - Optional
   OPENROUTER_API_KEY=your-openrouter-api-key-here

   # Enable/Disable services
   ENABLE_OPENROUTER=false
   ```

4. **Initialize database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── analyze/       # Plant analysis endpoint
│   │   ├── chat/          # AI chat endpoint
│   │   ├── strains/       # Strain management
│   │   ├── history/       # Analysis history
│   │   └── sensors/       # Sensor data & automation
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── db.ts              # Database configuration
│   ├── socket.ts          # Socket.io setup
│   └── utils.ts           # Utility functions
└── hooks/                 # Custom React hooks
```

## 🔧 Development Commands

### Core Development
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build production application
npm run start        # Start production server
npm run lint         # Run ESLint checks
```

### Database Operations
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes (no migration)
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database to initial state
```

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

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
PORT=3000
HOST=127.0.0.1

# AI Services
LM_STUDIO_URL=http://localhost:1234
OPENROUTER_API_KEY=your-api-key
ENABLE_OPENROUTER=false

# Socket.IO
SOCKET_IO_ORIGINS=http://localhost:3000
SOCKET_IO_AUTH=false

# Database
DATABASE_URL="file:./db/custom.db"
```

### AI Model Configuration
- **Local Models**: Supports any model loaded in LM Studio
- **Cloud Models**: Configurable OpenRouter models (Claude, GPT, etc.)
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

## 🔌 API Endpoints
### Health & Version
```
GET /api/health
GET /api/version
```

### Analysis APIs
- `POST /api/analyze` - Manual plant health analysis
- `POST /api/auto-analyze` - Automatic sensor-based analysis
- `GET /api/analyze` - Get analysis history

### Plant Analysis
```
POST /api/analyze
Content-Type: application/json

{
  "strain": "Blue Dream",
  "leafSymptoms": "Purple leaves, yellowing, curling",
  "phLevel": "6.2",
  "temperature": 75,
  "humidity": 60,
  "medium": "Soil",
  "growthStage": "Flowering"
}
```

### AI Chat
```
POST /api/chat
Content-Type: application/json

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

### Strain Management
```
GET /api/strains          # Get all strains
POST /api/strains         # Create new strain
PUT /api/strains          # Update strain
DELETE /api/strains?id=x  # Delete strain
```

### Sensor Data
```
GET /api/sensors          # Get current sensor data
POST /api/sensors         # Control automation
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

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Configure production database
2. Set up AI API keys
3. Configure SSL certificates
4. Set up monitoring and logging

### Deployment Options
- **VPS**: DigitalOcean, Vultr, Linode
- **Cloud**: AWS, Google Cloud, Azure
- **Container**: Docker, Podman
- **PaaS**: Heroku, Railway, Render

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

**Built with ❤️ for cannabis cultivation professionals**
