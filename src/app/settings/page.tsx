'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AIProviderSettings } from '@/components/ai/AIProviderSettings';
import { AgentEvolverSettings } from '@/components/ai/AgentEvolverSettings';
import { Brain, Cpu, Settings2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Settings2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
              <p className="text-slate-400">
                Configure AI providers and AgentEvolver without losing any options.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Configuration</CardTitle>
            <CardDescription className="text-slate-400">
              All settings are organized by capability. Changes save per section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ai" className="space-y-6">
              <TabsList className="bg-slate-800/60 text-slate-300">
                <TabsTrigger value="ai" className="data-[state=active]:text-emerald-300">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Providers
                </TabsTrigger>
                <TabsTrigger value="evolver" className="data-[state=active]:text-emerald-300">
                  <Cpu className="w-4 h-4 mr-2" />
                  AgentEvolver
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="space-y-4">
                <AIProviderSettings />
              </TabsContent>

              <TabsContent value="evolver" className="space-y-4">
                <AgentEvolverSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
