"use client";

import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
