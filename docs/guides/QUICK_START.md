# CannaAI Pro - Quick Start Guide

## 🚀 Getting Started Immediately

### 1. Install All Dependencies
```bash
npm run setup
npm run db:generate
npm run db:push
```

### 2. Start Development Environment
```bash
npm run dev
```

This will start:
- **Frontend (New UI)**: http://localhost:5173
- **Backend (Next.js)**: http://localhost:3000

### 3. Access Your Application
Open your browser to **http://localhost:5173** to see the new CannaAI Pro interface.

## 🔧 Available Commands

### Development
| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend & backend (recommended) |
| `npm run dev:backend` | Start only the backend in development |
| `npm run dev:frontend` | Start only the Vite frontend in development |
| `npm run start:both` | Advanced startup with health checks |

### Utilities & Diagnostics
| Command | Description |
|---------|-------------|
| `npm run check:ports` | Check if ports 3000/5173 are available |
| `npm run health` | One-time service health check |
| `npm run health -- --watch` | Continuous health monitoring |
| `npm run setup` | Install all dependencies (backend + frontend) |

### Production
| Command | Description |
|---------|-------------|
| `npm run build` | Build both frontend & backend |
| `npm run deploy:prod` | Run the repository deployment helper |
| `npm run deploy:build` | Run the deployment helper in build-only mode |
| `npm run start` | Start both services in production mode |
| `npm run start:prod` | Start both services through the production launcher |

## 📁 Architecture

```
Frontend (Vite/React)  →  Backend (Next.js/Socket.IO)
Port: 5173              Port: 3000
├── UI Components       ├── API Endpoints
├── Routing             ├── Real-time WebSocket
└── Client-side Logic   └── Database Operations
```

## 🎯 What's Ready

✅ **New UI**: Modern React interface with Vite
✅ **Backend API**: All Next.js endpoints available
✅ **Real-time Features**: Socket.IO integration working
✅ **Database**: Prisma/SQLite configuration ready
✅ **Development**: Hot reload on both services

## 🔌 API Communication

The frontend communicates with the backend at `http://localhost:3000/api/*`. All existing API endpoints from the original Next.js application are preserved and accessible to the New UI.

## 🛠️ Development Tips

- Both services start simultaneously with `npm run dev`
- Changes to frontend code (New UI) auto-reload at localhost:5173
- Changes to backend code (Next.js) auto-reload at localhost:3000
- Socket.IO connections work between frontend and backend
- CORS is configured to allow development on both ports

## 🔧 Troubleshooting

### Port Conflicts
```bash
npm run check:ports      # See what's using ports 3000/5173
```

### Services Won't Start
```bash
npm run health -- --watch    # Monitor service health
npm run clean                # Reset everything
```

### Database Issues
```bash
npm run db:reset         # Reset database to clean state
npm run db:generate      # Regenerate Prisma client
```

### Fresh Start
```bash
npm run clean            # Clean all node_modules and reinstall
npm run setup            # Install all dependencies
```

## 📚 Documentation

- `HYBRID_ARCHITECTURE.md` - Detailed architecture documentation
- `test-hybrid-setup.js` - Automated setup verification script

**Happy coding! 🎉**
