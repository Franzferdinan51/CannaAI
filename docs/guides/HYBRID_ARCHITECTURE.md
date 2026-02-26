# CannaAI Pro - Hybrid Architecture

This project uses a hybrid architecture with separate frontend and backend services:

## Architecture Overview

- **Frontend**: New UI built with Vite + React (Port 5173)
- **Backend**: Next.js API server with Socket.IO (Port 3000)

## Development Scripts

### Main Development (Recommended)
```bash
npm run dev          # Start both frontend and backend concurrently
npm run dev:win      # Windows version with proper command syntax
```

### Individual Services
```bash
npm run dev:frontend # Start only the Vite frontend (port 5173)
npm run dev:backend  # Start only the Next.js backend (port 3000)
```

### Build Scripts
```bash
npm run build        # Build both frontend and backend
npm run build:frontend # Build only the frontend
npm run build:backend  # Build only the Next.js backend
```

### Production
```bash
npm run start        # Start both services in production mode
npm run start:win    # Windows version for production
```

### Utility Scripts
```bash
npm run setup        # Install dependencies for both main and New UI
npm run install:all  # Install dependencies for both projects
npm run clean        # Clean and reinstall all node_modules
npm run lint         # Lint both frontend and backend
```

### Database
```bash
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database to initial state
```

## Port Configuration

- **Frontend (Vite)**: http://localhost:5173
- **Backend (Next.js)**: http://localhost:3000

## API Communication

The frontend communicates with the backend through:
- HTTP API calls to http://localhost:3000/api/*
- WebSocket connections to http://localhost:3000 for real-time data

## CORS Configuration

The backend is configured to accept connections from both ports (3000 and 5173) during development, including support for:
- Local network access (192.168.x.x, 10.x.x.x)
- Tailscale network (100.x.x.x)
- Custom hostnames

## Environment Variables

Backend server uses these environment variables:
- `NODE_ENV`: Development or production mode
- `PORT`: Backend port (default: 3000)
- `HOST`: Host binding (default: 0.0.0.0)
- `SOCKET_IO_ORIGINS`: Comma-separated allowed origins for Socket.IO
- `SOCKET_IO_AUTH`: Enable Socket.IO authentication (true/false)

Frontend environment variables should be set in `NewUI/cannaai-pro/.env`:
- `GEMINI_API_KEY`: API key for Google Gemini integration

## Project Structure

```
CannaAI/
├── package.json              # Main project configuration
├── server.ts                 # Next.js server with Socket.IO
├── src/                      # Next.js source code (backend)
│   ├── app/api/             # API endpoints
│   └── lib/                 # Shared utilities
├── NewUI/
│   └── cannaai-pro/         # Vite frontend application
│       ├── src/             # React components
│       ├── package.json     # Frontend dependencies
│       └── vite.config.ts   # Vite configuration
└── db/                      # Database files
```

## Development Workflow

1. **Initial Setup**:
   ```bash
   npm run setup
   ```

2. **Start Development**:
   ```bash
   npm run dev
   ```
   This will start both services concurrently with live reload.

3. **Access Applications**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api

## Troubleshooting

### Port Conflicts
If you experience port conflicts, you can modify the ports in:
- Backend: `PORT` environment variable or hardcoded in `server.ts`
- Frontend: `NewUI/cannaai-pro/vite.config.ts`

### Dependencies Issues
If you encounter dependency issues, try:
```bash
npm run clean
npm run setup
```

### Build Issues
For build-specific issues:
```bash
npm run build:frontend  # Test frontend build
npm run build:backend   # Test backend build
```

## Deployment

For production deployment:
1. Build both projects: `npm run build`
2. Deploy the Next.js backend (port 3000)
3. Deploy the Vite frontend build to a web server
4. Update CORS configuration for production domains