import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-400 mb-6">
              An error occurred while loading this component.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-gray-400">
                  Error Details
                </summary>
                <pre className="mt-2 p-4 bg-gray-800 rounded text-xs overflow-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const LoadingSpinner: React.FC<{ message?: string }> = ({
  message = 'Loading...'
}) => (
  <div className="flex-1 flex items-center justify-center bg-gray-900">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-400">{message}</p>
    </div>
  </div>
);

// Lazy load components for better performance
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const Scanner = lazy(() => import('./components/scanner/Scanner').then(module => ({ default: module.Scanner })));
const Plants = lazy(() => import('./components/plants/PlantsSimple').then(module => ({ default: module.default })));
const Sensors = lazy(() => import('./components/sensors').then(module => ({ default: module.default })));
const Reports = lazy(() => import('./components/reports/ReportsSimple').then(module => ({ default: module.default })));
const Chat = lazy(() => import('./components/chat/Chat').then(module => ({ default: module.Chat })));
const Settings = lazy(() => import('./components/settings/Settings').then(module => ({ default: module.Settings })));
const Automation = lazy(() => import('./components/automation/AutomationSimple').then(module => ({ default: module.default })));

import { SocketProvider } from './contexts/SocketContext';
import { useSocket } from './lib/socket';

import './index.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Socket connection wrapper
function AppWithSocket() {
  const { connect } = useSocket();

  React.useEffect(() => {
    // Connect to socket when app mounts
    connect();
  }, [connect]);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingSpinner message="Loading layout..." />}>
          <Layout>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Redirect root to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Main Application Routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/plants" element={<Plants />} />
                <Route path="/sensors" element={<Sensors />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/automation" element={<Automation />} />

                {/* Nested routes for specific functionality */}
                <Route path="/plants/:plantId" element={<Plants />} />
                <Route path="/sensors/:sensorId" element={<Sensors />} />
                <Route path="/automation/:system" element={<Automation />} />

                {/* Legacy route support */}
                <Route path="/dashboard/:tab" element={<Dashboard />} />
                <Route path="/analytics" element={<Navigate to="/reports" replace />} />
                <Route path="/assistant" element={<Navigate to="/chat" replace />} />

                {/* 404 fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </Suspense>

        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#1f2937',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1f2937',
              },
            },
            loading: {
              iconTheme: {
                primary: '#f59e0b',
                secondary: '#1f2937',
              },
            },
          }}
        />
      </Router>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <AppWithSocket />
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
