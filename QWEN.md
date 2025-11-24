# CannaAI - Cannabis Cultivation Management System

## Project Overview

CannaAI is an advanced AI-powered cannabis cultivation management system built with Next.js 15. It provides a comprehensive solution for cannabis growers with features including real-time plant health analysis, sensor monitoring, automation controls, cultivation analytics, and integrated business management tools.

### Key Features

- **AI-Powered Plant Analysis**: Advanced analysis of plant health issues including nutrient deficiencies, pests, and diseases
- **Purple Strain Intelligence**: Accurately distinguishes between genetic purple strains and phosphorus deficiency symptoms
- **Multi-Model AI Support**: Integrates 7 AI providers (LM Studio, Google Gemini, Anthropic Claude, Groq, OpenRouter, OpenAI-compatible) with intelligent fallback
- **AgentEvolver**: Self-evolving AI system with intelligent prompt optimization
- **Real-Time Monitoring**: Live sensor data for temperature, humidity, pH, EC, soil moisture, light intensity, CO2 levels
- **Automation Controls**: Smart watering, climate control, lighting schedules, and nutrient dosing
- **Trichome Analysis**: Microscopic trichome maturity assessment for precise harvest timing
- **Live Vision Monitoring**: Real-time webcam/microscope health monitoring with change detection
- **Business Management**: Harvest tracking, inventory management, clone tracking, and profitability analysis

### Technology Stack

- **Frontend**: Next.js 15 with App Router, TypeScript 5, Tailwind CSS 4, shadcn/ui components
- **Backend**: Node.js with custom server implementation, Socket.IO for real-time features
- **Database**: SQLite with Prisma ORM for type-safe operations
- **AI Integration**: Z-AI Web Dev SDK with support for multiple providers
- **State Management**: Zustand for client state, TanStack Query for server state
- **Development**: TypeScript with relaxed strictness for flexibility, ESLint, nodemon with tsx

## Building and Running

### Prerequisites
- Node.js 18+ (required for tsx execution)
- npm 9+ (for dependency management)
- Git (for version control)
- Python 3.8+ (for AgentEvolver - if using self-evolving AI features)

### Installation and Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Initialize database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

3. **Set up environment variables** (Optional)
   ```bash
   cp .env.local.example .env.local
   ```
   Configure your AI services in `.env.local` with keys for services like OpenRouter, LM Studio, etc.

### Running the Application

The project provides multiple startup modes via `startup.bat` (Windows) or npm scripts:

1. **Development Mode**:
   ```bash
   npm run dev          # Unix
   npm run dev:win      # Windows
   # Or simply double-click startup.bat and select option 1
   ```

2. **Production Mode**:
   ```bash
   npm run build
   npm run start        # Unix
   npm run start:win    # Windows
   ```

3. **Development with AgentEvolver** (Self-Evolving AI):
   ```bash
   # Use startup.bat option 2 for development with AgentEvolver
   ```

4. **Remote Access Mode**:
   ```bash
   # Use startup.bat option 7 for network/Tailscale access
   ```

The application will be accessible at `http://localhost:3000` (or `http://0.0.0.0:3000` for remote access).

### AI Provider Configuration

CannaAI supports multiple AI providers:
- **LM Studio** (Local): For private, offline AI processing
- **Google Gemini**: With 1-2M token context window and vision support
- **Anthropic Claude**: Advanced reasoning capabilities with 200k context window
- **Groq**: Ultra-fast inference (10-100x faster)
- **OpenRouter**: Access to multiple models (Claude, GPT, Llama, etc.)
- **OpenAI-compatible**: Any OpenAI-compatible endpoint
- **Self-evolving AI**: AgentEvolver for intelligent prompt optimization

## Development Conventions

### Code Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components, including shadcn/ui primitives
- `src/lib/` - Utility functions, database configuration, and Socket.IO setup
- `src/hooks/` - Custom React hooks
- `agentevolver/` - Python-based self-evolving AI backend
- `prisma/` - Database schema and migrations

### Development Workflow
- Use TypeScript with flexible strictness for rapid development
- Implement component-based architecture with Tailwind CSS for styling
- Use Zod schemas for runtime type checking
- Follow Next.js App Router conventions for routing and API routes
- Use Socket.IO for real-time features and live sensor monitoring

### API Endpoints
The application provides 19 RESTful API endpoints covering:
- Plant health analysis and history
- AI services and model management
- Business management (harvest tracking, inventory, cloning)
- Sensor data and automation controls
- Strain management and user settings

### Database Schema
The project uses Prisma ORM with SQLite:
- User model for authentication
- Post model as example (can be extended for cultivation logs)

## Special Features

### AgentEvolver - Self-Evolving AI System
- Intelligent prompt optimization that automatically enhances AI prompts
- Cannabis domain expertise built-in
- Continuous learning from user feedback
- Runs as a separate Python server on port 8001
- Provides `/optimize`, `/metrics`, `/history`, and `/feedback` endpoints

### Advanced Analysis Capabilities
- Trichome microscopy analysis for harvest timing
- Live vision monitoring with change detection
- Purple strain identification logic to distinguish genetic purple from phosphorus deficiency
- Multi-room management with individual sensor tracking

### Deployment Options
- Traditional server deployment on VPS/cloud
- Static export for Netlify hosting
- Network/remote access modes with Tailscale support
- Cross-platform support with Windows batch scripts

### Business Management
- Comprehensive harvest tracking with THC/CBD percentages
- Inventory management with low stock alerts
- Clone and propagation tracking
- Cost analysis and profitability metrics
- Category expense breakdown and ROI analysis

## Troubleshooting

- For port conflicts, use the startup.bat script which will detect and help resolve conflicts
- If database issues occur, use `npm run db:reset` to reset the database
- For AI service issues, ensure your API keys are correctly configured in environment variables
- For Netlify deployment issues, use the static build command: `npm run build:netlify`

## Security Considerations

- Input validation and sanitization implemented
- API rate limiting to prevent abuse
- CORS configuration for secure cross-origin requests
- Environment variable protection for sensitive data
- WebSocket authentication options available
- Network access restricted by default (use HOST=0.0.0.0 only on trusted networks)

## Project Statistics

- Framework: Next.js 15.3.5 with React 19 and Custom Server
- Lines of Code: 26,000+ (main dashboard), 50,000+ total
- API Endpoints: 19 RESTful endpoints for comprehensive control
- Supported AI Providers: 7 (with automatic fallback between providers)
- Startup Modes: 9 different modes via startup.bat (Windows)
- Deployment Options: Traditional server, static export (Netlify), remote access

# Using Gemini CLI for Large Codebase Analysis

  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

  ## File and Directory Inclusion Syntax

  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:

  ### Examples:

  **Single file analysis:**
  ```bash
  gemini -p "@src/main.py Explain this file's purpose and structure"

  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"

  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"

  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"
  
#
 Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"

  Implementation Verification Examples

  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

  When to Use Gemini CLI

  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase

  Important Notes

  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results # Using Gemini CLI for Large Codebase Analysis


  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.


  ## File and Directory Inclusion Syntax


  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:


  ### Examples:


  **Single file analysis:**
  ```bash
  gemini -p "@src/main.py Explain this file's purpose and structure"


  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"


  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"


  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"


  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"
  # Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"


  Implementation Verification Examples


  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"


  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"


  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"


  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"


  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"


  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"


  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"


  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"


  When to Use Gemini CLI


  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase


  Important Notes


  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results
