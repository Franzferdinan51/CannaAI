# CannaAI Pro - New UI Development Setup

## Overview

The New UI is a modern React SPA built with Vite that connects to the existing Next.js backend API. This provides a clean separation between the frontend and backend, allowing for enhanced UI development while maintaining all existing functionality.

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Existing Next.js 15 API (running on port 3000)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State Management**: Zustand + TanStack Query
- **Real-time**: Socket.IO client
- **Animations**: Framer Motion
- **Routing**: React Router v6

## Development Setup

### Prerequisites

1. Node.js 18+ installed
2. Existing CannaAI backend running on `http://localhost:3000`

### Getting Started

1. **Navigate to the New UI directory:**
   ```bash
   cd "C:\Users\Ryan\Desktop\CannaAI\NewUI\cannaai-pro"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Edit `.env.local` and set your API keys:
   ```env
   # AI Service Configuration
   GEMINI_API_KEY=your_gemini_api_key_here

   # API Configuration
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_SOCKET_URL=http://localhost:3000
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api

## Project Structure

```
src/
├── components/
│   ├── dashboard/     # Dashboard components
│   ├── scanner/       # Plant scanner interface
│   ├── plants/        # Plant management
│   ├── sensors/       # Real-time sensor monitoring
│   ├── chat/          # AI assistant interface
│   ├── settings/      # Settings and configuration
│   └── Layout.tsx     # Main application layout
├── lib/
│   ├── api.ts         # API client configuration
│   └── socket.ts      # Socket.IO client setup
├── contexts/
│   └── SocketContext.tsx # Socket state management
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── services/          # API service functions
```

## Available Features

### ✅ Implemented

- **Dashboard**: Real-time system monitoring with sensor data
- **Scanner**: Plant image upload and analysis interface
- **Sensors**: Live sensor data visualization
- **Chat**: AI cultivation assistant interface
- **Navigation**: React Router with animated transitions
- **API Integration**: Full connectivity to existing backend
- **Real-time Updates**: Socket.IO integration for live data
- **Responsive Design**: Mobile-friendly interface
- **Dark Theme**: Consistent CannaAI Pro styling

### 🚧 In Progress

- **Plant Management**: Strain tracking and plant profiles
- **Reports & Analytics**: Historical data analysis
- **Settings**: Configuration management
- **Enhanced Photo Analysis**: US Hemp Research integration

## API Integration

The frontend connects to these existing backend endpoints:

### Core APIs
- `GET /api/health` - System health check
- `GET /api/version` - Version information
- `GET /api/sensors` - Real-time sensor data
- `POST /api/analyze` - Plant health analysis
- `POST /api/chat` - AI assistant

### Data Management
- `GET /api/strains` - Strain management
- `GET /api/history` - Analysis history
- `GET /api/settings` - System settings

### Real-time Features
- WebSocket connection at `/api/socketio`
- Live sensor data updates
- Real-time notifications

## Development Commands

```bash
# Development
npm run dev          # Start development server

# Build
npm run build        # Build for production

# Preview
npm run preview      # Preview production build

# Lint (if configured)
npm run lint         # Run ESLint
```

## Port Configuration

- **Frontend (Vite)**: Port 5173
- **Backend (Next.js)**: Port 3000
- **Socket.IO**: Uses backend server on port 3000

## Browser Access

Once both servers are running:

1. **Main Application**: http://localhost:5173
2. **Backend API**: http://localhost:3000/api
3. **Health Check**: http://localhost:3000/api/health

## Migration Notes

### Backend Compatibility
- All existing API endpoints remain unchanged
- Socket.IO endpoints preserved
- Database operations continue through existing Prisma setup

### Frontend Improvements
- Modern React 19 features
- Improved performance with Vite
- Better developer experience
- Enhanced animation capabilities
- Cleaner component architecture

### Next Steps

1. **Complete Component Implementation**: Finish implementing all dashboard features
2. **Enhanced Analytics**: Add comprehensive reporting and data visualization
3. **Mobile Optimization**: Ensure responsive design across all devices
4. **Performance Optimization**: Implement code splitting and lazy loading
5. **Testing**: Add comprehensive test coverage
6. **Deployment**: Configure production build and deployment pipeline

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**:
   - Ensure Next.js server is running on port 3000
   - Check API endpoints are accessible via browser

2. **Socket.IO Connection Issues**:
   - Verify backend server is running
   - Check firewall settings
   - Ensure WebSocket connections are allowed

3. **Build Errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript configuration
   - Verify all imports are correct

### Environment Variables

Make sure these are set in `.env.local`:
- `GEMINI_API_KEY`: Required for AI analysis features
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_SOCKET_URL`: WebSocket server URL

## Contributing

When adding new features:

1. Follow the existing component structure
2. Use TypeScript for type safety
3. Implement proper error handling
4. Add responsive design considerations
5. Maintain consistent styling with Tailwind CSS
6. Test API integration before committing

## Support

For issues or questions:
- Check backend server status first
- Verify API connectivity
- Review browser console for errors
- Check network tab for failed requests