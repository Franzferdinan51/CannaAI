import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { NotificationProvider } from '@/components/ui/NotificationSystem';
import { socketClient } from '@/lib/socket/client';
import { queryClient } from '@/lib/query/client';

// Example Application Structure
import ExampleDashboard from './ExampleDashboard';

// =============================================================================
// App Component
// =============================================================================

function App() {
  // Initialize socket connection
  React.useEffect(() => {
    // Connect to socket when app mounts
    socketClient.connect().catch(error => {
      console.error('Failed to connect to socket:', error);
    });

    // Disconnect when app unmounts
    return () => {
      socketClient.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        // Custom error handling (e.g., send to error tracking service)
        console.error('App Error:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <NotificationProvider
          maxNotifications={5}
          defaultDuration={5000}
          position="top-right"
        >
          <div className="min-h-screen bg-gray-50">
            <ExampleDashboard />
          </div>
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;