'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Bug, Calculator, Beaker, Settings, TrendingUp, BookOpen, Wrench, Scissors } from 'lucide-react';

const tools = [
  {
    name: 'Harvest Tracker',
    description: 'Comprehensive harvest management with analytics, yield tracking, and curing batch management',
    href: '/tools/harvest-tracker',
    icon: Scissors,
    status: 'Active',
    statusColor: 'bg-green-500',
    features: ['Harvest Logging', 'Yield Analytics', 'Curing Management', 'Quality Tracking'],
    category: 'Harvest'
  },
  {
    name: 'Pest & Disease Identifier',
    description: 'Comprehensive plant health management with AI-powered identification and treatment tracking',
    href: '/tools/pest-disease-id',
    icon: Bug,
    status: 'Active',
    statusColor: 'bg-green-500',
    features: ['Visual Analysis', 'Treatment Tracking', 'Comprehensive Database', 'AI Analysis'],
    category: 'Plant Health'
  },
  {
    name: 'Nutrient Calculator',
    description: 'Calculate optimal nutrient ratios, feeding schedules, and manage your plant nutrition',
    href: '/tools/nutrient-calculator',
    icon: Calculator,
    status: 'Coming Soon',
    statusColor: 'bg-yellow-500',
    features: ['NPK Calculations', 'pH Management', 'Feeding Schedules', 'EC Monitoring'],
    category: 'Nutrition'
  },
  {
    name: 'Strain Library',
    description: 'Complete cannabis strain database with detailed cultivation guides and user experiences',
    href: '/tools/strain-library',
    icon: Beaker,
    status: 'Coming Soon',
    statusColor: 'bg-yellow-500',
    features: ['Strain Profiles', 'Growth Requirements', 'Harvest Data', 'User Reviews'],
    category: 'Genetics'
  },
  {
    name: 'System Diagnostics',
    description: 'Monitor and optimize your cultivation system performance with real-time analytics',
    href: '/tools/diagnostics',
    icon: Settings,
    status: 'Planned',
    statusColor: 'bg-blue-500',
    features: ['System Health', 'Performance Metrics', 'Maintenance Alerts', 'Optimization Tips'],
    category: 'System'
  },
  {
    name: 'Harvest Optimizer',
    description: 'Predict optimal harvest timing based on trichome development and strain characteristics',
    href: '/tools/harvest-optimizer',
    icon: TrendingUp,
    status: 'Planned',
    statusColor: 'bg-blue-500',
    features: ['Trichome Analysis', 'Harvest Timing', 'Yield Prediction', 'Quality Assessment'],
    category: 'Harvest'
  },
  {
    name: 'Growing Journal',
    description: 'Track your grow journey with detailed notes, photos, and growth metrics',
    href: '/tools/growing-journal',
    icon: BookOpen,
    status: 'Planned',
    statusColor: 'bg-blue-500',
    features: ['Growth Tracking', 'Photo Timeline', 'Environmental Logs', 'Progress Analytics'],
    category: 'Tracking'
  }
];

const categories = [
  { name: 'All Tools', count: tools.length },
  { name: 'Plant Health', count: tools.filter(t => t.category === 'Plant Health').length },
  { name: 'Nutrition', count: tools.filter(t => t.category === 'Nutrition').length },
  { name: 'Genetics', count: tools.filter(t => t.category === 'Genetics').length },
  { name: 'System', count: tools.filter(t => t.category === 'System').length },
  { name: 'Harvest', count: tools.filter(t => t.category === 'Harvest').length },
  { name: 'Tracking', count: tools.filter(t => t.category === 'Tracking').length }
];

export default function ToolsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 mb-2">Cultivation Tools Suite</h1>
            <p className="text-slate-300 text-lg">
              Professional-grade tools to optimize your cannabis cultivation workflow
            </p>
          </div>
          <Wrench className="h-12 w-12 text-slate-400" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-200">{tools.length}</div>
              <div className="text-sm text-slate-400">Total Tools</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {tools.filter(t => t.status === 'Active').length}
              </div>
              <div className="text-sm text-slate-400">Active</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {tools.filter(t => t.status === 'Coming Soon').length}
              </div>
              <div className="text-sm text-slate-400">Coming Soon</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {tools.filter(t => t.status === 'Planned').length}
              </div>
              <div className="text-sm text-slate-400">Planned</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category.name}
              variant="outline"
              className="border-blue-600 text-slate-300 bg-slate-800/30 px-3 py-1"
            >
              {category.name} ({category.count})
            </Badge>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Card
            key={tool.name}
            className="bg-slate-800/50 border-slate-600 hover:bg-slate-800/70 transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/20"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    <tool.icon className="h-6 w-6 text-slate-300" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-200 text-lg">{tool.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={`text-xs mt-1 ${tool.statusColor} text-white`}
                    >
                      {tool.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="w-fit border-blue-600 text-slate-300 text-xs">
                {tool.category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed">
                {tool.description}
              </p>

              <div>
                <h4 className="text-slate-200 font-medium text-sm mb-2">Key Features:</h4>
                <div className="space-y-1">
                  {tool.features.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <span className="text-slate-300 text-xs">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                {tool.status === 'Active' ? (
                  <Link href={tool.href}>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-400 hover:to-sky-500 text-slate-900 font-medium">
                      Open Tool
                    </Button>
                  </Link>
                ) : tool.status === 'Coming Soon' ? (
                  <Button
                    disabled
                    className="w-full bg-slate-700/50 text-slate-400 font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full bg-slate-700/50 text-slate-400 font-medium cursor-not-allowed"
                  >
                    Planned
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roadmap Section */}
      <div className="mt-12">
        <Card className="bg-slate-800/50 border-slate-600">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Development Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-blue-300 mb-3">Q1 2025</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-sm text-slate-300">Pest & Disease ID</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                    <span className="text-sm text-slate-300">Nutrient Calculator</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-blue-300 mb-3">Q2 2025</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                    <span className="text-sm text-slate-300">Strain Library</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-sm text-slate-300">System Diagnostics</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-blue-300 mb-3">Q3 2025</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-sm text-slate-300">Harvest Optimizer</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-sm text-slate-300">Growing Journal</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Request Section */}
      <div className="mt-8 text-center">
        <Card className="bg-slate-800/50 border-slate-600">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-slate-200 mb-2">Have an Idea?</h3>
            <p className="text-slate-300 mb-4">
              We're always looking to improve our tools. What features would help you grow better?
            </p>
            <Button variant="outline" className="border-blue-600 text-slate-300 hover:bg-slate-700/50">
              Suggest a Tool
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}