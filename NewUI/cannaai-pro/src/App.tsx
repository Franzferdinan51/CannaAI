import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Scanner from './components/scanner/Scanner';
import Plants from './components/plants/Plants';
import Sensors from './components/sensors/Sensors';
import Reports from './components/reports/Reports';
import Settings from './components/settings/Settings';
import Chat from './components/chat/Chat';
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
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
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
        }}
      />
    </Router>
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