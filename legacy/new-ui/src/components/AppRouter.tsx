'use client';

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { Dashboard } from './Dashboard';
import { UnifiedSettings } from './UnifiedSettings';
import { ErrorBoundary } from './ErrorBoundary';

// Lazy load components for better performance
const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      <p className="text-slate-400">Loading...</p>
    </div>
  </div>
);

// Page redirect component for root
const RootRedirect = () => <Navigate to="/dashboard" replace />;

export function AppRouter() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:tab" element={<Dashboard />} />

            {/* Settings */}
            <Route path="/settings" element={<UnifiedSettings />} />
            <Route path="/settings/:tab" element={<UnifiedSettings />} />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}