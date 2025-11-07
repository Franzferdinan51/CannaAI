# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CultivAI Pro is an advanced cannabis cultivation management system built with Next.js 15, TypeScript, and modern web technologies. It features AI-powered plant health analysis, real-time sensor monitoring, automation controls, and comprehensive analytics for cannabis cultivation.

## Development Commands

### Core Development
- `npm run dev` - Start development server with nodemon and live reload (logs to dev.log)
- `npm run build` - Build production application
- `npm run start` - Start production server (logs to server.log)
- `npm run lint` - Run ESLint for code quality checks

### Database Operations
- `npm run db:push` - Push schema changes to database without migration
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations in development
- `npm run db:reset` - Reset database to initial state

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router and custom server
- **Language**: TypeScript 5 with relaxed strictness
- **Database**: SQLite with Prisma ORM
- **UI**: Tailwind CSS 4, shadcn/ui components, Framer Motion animations
- **Real-time**: Socket.IO for WebSocket communication
- **AI Integration**: Z-AI Web Dev SDK for plant analysis and chat assistance
- **State Management**: Zustand for client state, TanStack Query for server state

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── analyze/       # Plant health analysis endpoint
│   │   ├── chat/          # AI cultivation assistant
│   │   ├── sensors/       # Sensor data & automation controls
│   │   ├── strains/       # Strain management CRUD
│   │   ├── history/       # Analysis history
│   │   └── [other]/       # Various feature endpoints
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main dashboard (26k+ lines)
│   └── globals.css        # Global styles
├── components/
│   └── ui/                # shadcn/ui component library
├── lib/
│   ├── db.ts              # Prisma client configuration
│   ├── socket.ts          # Socket.IO setup and handlers
│   └── utils.ts           # Utility functions
└── hooks/                 # Custom React hooks
```

### Key Architecture Patterns

**Custom Server Setup**: Uses `server.ts` with custom HTTP server integrating Socket.IO alongside Next.js. The server handles both Next.js requests and WebSocket connections on `/api/socketio`.

**Database Schema**: Simple Prisma setup with SQLite featuring User and Post models (likely scaffolded, can be extended for cultivation-specific data).

**API Architecture**: RESTful endpoints in `/api` directory with error handling and JSON responses. Key endpoints include plant analysis, sensor data, strain management, and AI chat.

**Frontend Architecture**: Large single-page dashboard (`src/app/page.tsx`) with multiple tabs managing the entire application UI. Uses React hooks for state management and real-time Socket.IO integration.

## AI Integration

### Z-AI SDK Usage
The application uses the Z-AI Web Dev SDK for two main AI features:

1. **Plant Analysis** (`/api/analyze/route.ts`): Analyzes plant health data including strain, symptoms, pH, temperature, humidity to provide detailed cultivation recommendations.

2. **AI Chat Assistant** (`/api/chat/route.ts`): Provides real-time cultivation advice and troubleshooting guidance.

### AI Model Configuration
- Supports LM Studio for local models
- OpenRouter integration for cloud-based models
- Custom model endpoint configuration

## Real-time Features

### Socket.IO Implementation
- Custom server setup in `server.ts` with Socket.IO integration
- WebSocket endpoint at `/api/socketio`
- Basic echo server implementation in `src/lib/socket.ts`
- Used for real-time sensor data updates and notifications

### Sensor Data & Automation
- Mock sensor data with realistic cultivation metrics (temperature, humidity, pH, EC, CO2, VPD)
- Automation controls for watering, lighting, and climate systems
- Multi-room support with individual monitoring
- cron-based scheduling for automation routines

## Development Notes

### Configuration Specifics
- TypeScript strict mode disabled for flexibility (`noImplicitAny: false`)
- ESLint errors ignored during builds for faster development
- Next.js hot reloading disabled in favor of nodemon
- Development server runs on `0.0.0.0:3000`

### Build Process
- Uses `tsx` for TypeScript execution in server.js
- Nodemon watches `server.ts`, `src` directory with ts/tsx/js/jsx extensions
- Production builds ignore TypeScript and ESLint errors for speed

### Database Development
- SQLite database with file-based storage (`db/custom.db`)
- Prisma for type-safe database operations
- Simple schema (User/Post) that can be extended for cultivation features

## Key Features Implementation

### Plant Health Analysis
- Image upload capability for leaf analysis
- Purple strain detection and differentiation from nutrient deficiencies
- Comprehensive symptom analysis with confidence scoring
- Strain-specific recommendation system

### Dashboard Components
- Multi-tab interface: Overview, Automation, Analytics, Settings
- Real-time sensor monitoring with status indicators
- Historical data visualization with Recharts
- Strain management with custom profiles
- AI chat integration for cultivation assistance

### Automation System
- Smart watering based on soil moisture thresholds
- Climate control with customizable temperature/humidity ranges
- Lighting schedule management for vegetative and flowering stages
- Remote room management and monitoring

## Testing & Deployment

### Environment Setup
- Node.js 18+ required
- Uses `tsx` for TypeScript execution
- Development with nodemon for hot reloading
- Production optimized builds with error ignoring

### Database Management
- Prisma migrations for schema changes
- Client generation with `npm run db:generate`
- Reset capability for development (`npm run db:reset`)

This codebase prioritizes rapid development flexibility over strict type safety, making it ideal for AI-powered cultivation management features and quick iteration on new functionality.