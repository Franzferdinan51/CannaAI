# CannaAI Frontend Integration Layer

A comprehensive API integration layer for the CannaAI New UI (Vite/React SPA) that seamlessly connects with the existing Next.js backend. This layer provides type-safe API communication, real-time WebSocket connections, intelligent caching, and comprehensive error handling.

## 🚀 Features

### API Client
- **Base API Client**: Axios-based client with comprehensive configuration
- **Request/Response Interceptors**: Automatic error handling, rate limiting, and retry logic
- **Security Headers**: Built-in security measures and request validation
- **Type-Safe Interfaces**: Complete TypeScript coverage for all API endpoints
- **File Upload Support**: Progress tracking and file validation
- **Streaming Support**: For real-time data and responses

### Service Layer
- **Plant Analysis Service**: Photo analysis with AI integration
- **AI Chat Service**: Context-aware cultivation assistant
- **Sensors Service**: Real-time sensor data and automation controls
- **Strain Management**: CRUD operations for cannabis strains
- **Settings Service**: AI provider configuration and application settings
- **History Service**: Analysis history and tracking

### React Query Integration
- **Smart Caching**: Intelligent data caching and synchronization
- **Optimistic Updates**: Immediate UI feedback with rollback on errors
- **Query Hooks**: Pre-built hooks for all API operations
- **Mutation Hooks**: Data modification with automatic cache invalidation
- **Background Updates**: Automatic data refetching and synchronization
- **DevTools Support**: Full React Query DevTools integration

### Socket.IO Client
- **Real-time Communication**: WebSocket connection to backend
- **Automatic Reconnection**: Intelligent reconnection with exponential backoff
- **Connection Status**: Real-time connection monitoring and status
- **Event Handlers**: Comprehensive event system for real-time updates
- **React Hooks**: Easy integration with React components

### Error Handling & UX
- **Error Boundaries**: React error boundaries with fallback UI
- **Notification System**: Beautiful toast notifications with actions
- **Loading States**: Comprehensive loading components and skeletons
- **Global Error Handler**: Centralized error management and reporting
- **User-Friendly Messages**: Clear, actionable error messages

## 📁 Project Structure

```
new-ui/src/
├── components/
│   └── ui/
│       ├── ErrorBoundary.tsx      # React error boundary component
│       ├── LoadingStates.tsx      # Loading and skeleton components
│       └── NotificationSystem.tsx # Toast notification system
├── hooks/
│   ├── index.ts                   # Main hooks export
│   ├── useSocket.ts              # Socket.IO React hooks
│   └── queries/
│       ├── index.ts              # Query hooks export
│       ├── useAnalysisQueries.ts # Analysis-related queries
│       └── useSensorsQueries.ts  # Sensor-related queries
├── lib/
│   ├── api/
│   │   └── client.ts             # Axios API client configuration
│   ├── query/
│   │   └── client.ts             # React Query configuration
│   ├── socket/
│   │   └── client.ts             # Socket.IO client implementation
│   └── utils/
│       └── errorHandling.ts      # Error handling utilities
├── services/
│   ├── analysisService.ts        # Plant analysis API service
│   ├── chatService.ts            # AI chat API service
│   ├── sensorsService.ts         # Sensor data API service
│   ├── strainsService.ts         # Strain management API service
│   └── settingsService.ts        # Settings API service
├── types/
│   └── api.ts                    # Complete TypeScript type definitions
└── example/
    └── App.tsx                   # Example application setup
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- React 18+
- Vite 4+
- Existing CannaAI backend running on `http://localhost:3000`

### Install Dependencies

```bash
# Core dependencies
npm install react react-dom
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install axios socket.io-client

# UI dependencies (using Lucide icons)
npm install lucide-react

# Development dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D typescript
```

### Environment Variables

Create a `.env.local` file in your project root:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000

# Application Configuration
REACT_APP_VERSION=1.0.0
NODE_ENV=development
```

## 🔧 Setup

### 1. App Integration

Wrap your application with the required providers:

```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { NotificationProvider } from '@/components/ui/NotificationSystem';
import { socketClient } from '@/lib/socket/client';
import { queryClient } from '@/lib/query/client';

function App() {
  React.useEffect(() => {
    socketClient.connect();
    return () => socketClient.disconnect();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <YourApp />
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
```

### 2. Using API Services

```tsx
import { useAnalyzePlant } from '@/hooks';
import { PlantAnalysisRequest } from '@/types/api';

function AnalysisComponent() {
  const analyzeMutation = useAnalyzePlant();

  const handleAnalysis = async (data: PlantAnalysisRequest) => {
    try {
      const result = await analyzeMutation.mutateAsync(data);
      console.log('Analysis result:', result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  return (
    <div>
      {/* Your UI here */}
      <button
        onClick={() => handleAnalysis({
          strain: 'Blue Dream',
          leafSymptoms: 'Yellowing leaves',
          phLevel: 6.2,
          temperature: 75,
          humidity: 55
        })}
        disabled={analyzeMutation.isLoading}
      >
        {analyzeMutation.isLoading ? 'Analyzing...' : 'Analyze Plant'}
      </button>
    </div>
  );
}
```

### 3. Real-time Data with Socket.IO

```tsx
import { useSocket, useRealtimeSensors } from '@/hooks';

function SensorDashboard() {
  const { isConnected } = useSocket();
  const { currentSensors, sensorHistory } = useRealtimeSensors();

  return (
    <div>
      <div>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</div>

      {currentSensors && (
        <div>
          <h3>Current Sensors</h3>
          <p>Temperature: {currentSensors.temperature}°F</p>
          <p>Humidity: {currentSensors.humidity}%</p>
          <p>pH: {currentSensors.ph}</p>
        </div>
      )}
    </div>
  );
}
```

### 4. Error Handling and Notifications

```tsx
import { useNotifications, useErrorHandler } from '@/hooks';
import { safeAsync } from '@/lib/utils/errorHandling';

function DataComponent() {
  const { showError, showSuccess } = useNotifications();
  const handleError = useErrorHandler();

  const fetchData = async () => {
    const [data, error] = await safeAsync(
      () => yourApiCall(),
      handleError.handleError
    );

    if (error) {
      showError(error.userMessage, error.message);
      return;
    }

    showSuccess('Data loaded successfully');
  };

  return <button onClick={fetchData}>Load Data</button>;
}
```

## 📚 Available Hooks

### API Hooks
- `useAnalyzePlant()` - Analyze plant health
- `useAnalysisHistory()` - Get analysis history
- `useSensorData()` - Get current sensor data
- `useRooms()` - Get room information
- `useAutomationSettings()` - Get automation settings
- `useStrains()` - Get strain data
- `useSettings()` - Get application settings

### Socket Hooks
- `useSocket()` - Main socket connection hook
- `useRealtimeSensors()` - Real-time sensor data
- `useSocketNotifications()` - Socket-based notifications
- `useConnectionStatus()` - Connection status UI

### Utility Hooks
- `useErrorHandler()` - Global error handling
- `useNotifications()` - Notification system
- `useLoading()` - Loading state management

## 🔧 Configuration

### Custom API Client

```tsx
import { ApiClient } from '@/lib/api/client';

const customClient = new ApiClient('https://your-api.com', {
  timeout: 10000,
  headers: {
    'Authorization': 'Bearer your-token'
  }
});
```

### Custom Socket Client

```tsx
import { SocketClient } from '@/lib/socket/client';

const customSocket = new SocketClient('ws://localhost:3000', {
  authToken: 'your-token',
  maxReconnectAttempts: 10,
  autoConnect: true
});
```

### Custom Query Configuration

```tsx
import { createQueryClient } from '@/lib/query/client';

const customQueryClient = createQueryClient();
customQueryClient.setDefaultOptions({
  queries: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  }
});
```

## 🚨 Error Handling

The integration layer provides comprehensive error handling:

1. **Automatic Retry**: Failed requests are automatically retried with exponential backoff
2. **Rate Limiting**: Automatic handling of rate limit responses
3. **Network Errors**: Graceful handling of network connectivity issues
4. **User Messages**: Clear, actionable error messages for users
5. **Error Reporting**: Automatic error reporting and logging

## 🔄 Real-time Features

- **Sensor Data**: Live sensor readings and updates
- **Analysis Progress**: Real-time analysis progress updates
- **Notifications**: System notifications and alerts
- **Connection Status**: Real-time connection monitoring
- **Automatic Reconnection**: Intelligent reconnection logic

## 🧪 Development

### Running the Example

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Debugging

Enable debug mode for detailed logging:

```tsx
// Enable socket debugging
socketClient.enableDebug();

// Enable React Query DevTools (included in development)
// Access via browser extension or integrated DevTools
```

### Error Tracking

In production, integrate with your error tracking service:

```tsx
// In your error handler
import * as Sentry from '@sentry/react';

const reportError = (errorInfo: ErrorInfo) => {
  Sentry.captureException(new Error(errorInfo.message), {
    extra: errorInfo
  });
};
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔐 Security

- **CORS**: Proper CORS configuration for cross-origin requests
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: Built-in rate limiting protection
- **Error Sanitization**: Sensitive information not exposed in errors

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new features
3. Include comprehensive error handling
4. Add tests for new functionality
5. Update documentation

## 📄 License

This project is part of the CannaAI ecosystem and follows the same licensing terms.

## 🆘 Support

For issues and questions:

1. Check the comprehensive error messages and suggestions
2. Review the browser console for detailed error information
3. Ensure the backend is running and accessible
4. Verify environment variables and configuration
5. Check network connectivity and firewall settings

## 🔄 Migration

If you're migrating from the old UI:

1. Replace existing API calls with the new service methods
2. Update state management to use React Query
3. Add error boundaries to major components
4. Implement real-time updates with Socket.IO hooks
5. Add loading states and skeleton components

The integration layer is designed to be a drop-in replacement for existing API calls while providing enhanced functionality and developer experience.