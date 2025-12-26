'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Bug, Calculator, Beaker, Settings, Scissors } from 'lucide-react';

const tools = [
  {
    name: 'Harvest Tracker',
    description: 'Comprehensive harvest management with analytics and curing batch tracking',
    href: '/tools/harvest-tracker',
    icon: Scissors,
    status: 'Active',
    features: ['Harvest Logging', 'Yield Analytics', 'Curing Management', 'Quality Tracking']
  },
  {
    name: 'Pest & Disease Identifier',
    description: 'Comprehensive plant health management with AI-powered identification',
    href: '/tools/pest-disease-id',
    icon: Bug,
    status: 'Active',
    features: ['Visual Analysis', 'Treatment Tracking', 'Comprehensive Database', 'AI Analysis']
  },
  {
    name: 'Nutrient Calculator',
    description: 'Calculate optimal nutrient ratios and feeding schedules',
    href: '/tools/nutrient-calculator',
    icon: Calculator,
    status: 'Coming Soon',
    features: ['NPK Calculations', 'pH Management', 'Feeding Schedules', 'EC Monitoring']
  },
  {
    name: 'Strain Library',
    description: 'Complete cannabis strain database with cultivation guides',
    href: '/tools/strain-library',
    icon: Beaker,
    status: 'Coming Soon',
    features: ['Strain Profiles', 'Growth Requirements', 'Harvest Data', 'User Reviews']
  },
  {
    name: 'System Diagnostics',
    description: 'Monitor and optimize your cultivation system performance',
    href: '/tools/diagnostics',
    icon: Settings,
    status: 'Planned',
    features: ['System Health', 'Performance Metrics', 'Maintenance Alerts', 'Optimization Tips']
  }
];

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathSegments = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const currentTool = pathSegments[pathSegments.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-lime-900">
      {/* Navigation Header */}
      <div className="bg-emerald-800/30 border-b border-emerald-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-emerald-300 hover:text-emerald-100 hover:bg-emerald-700/50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-emerald-600" />
              <h1 className="text-2xl font-bold text-emerald-100">Cultivation Tools</h1>
            </div>

            {currentTool !== 'tools' && (
              <Link href="/tools">
                <Button variant="outline" className="border-emerald-600 text-emerald-300 hover:bg-emerald-700/50">
                  View All Tools
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb for nested pages */}
      {currentTool !== 'tools' && (
        <div className="bg-emerald-800/20 border-b border-emerald-700/50">
          <div className="max-w-7xl mx-auto px-6 py-2">
            <div className="flex items-center space-x-2 text-sm text-emerald-400">
              <Link href="/tools" className="hover:text-emerald-200 transition-colors">
                Tools
              </Link>
              <span>/</span>
              <span className="text-emerald-200">
                {tools.find(t => t.href === `/tools/${currentTool}`)?.name || currentTool}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {children}
    </div>
  );
}