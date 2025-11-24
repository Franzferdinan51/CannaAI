'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AIProviderSettings } from '@/components/ai/AIProviderSettings';
import { LMStudioSettings } from '@/components/lmstudio/LMStudioSettings';
import { AgentEvolverSettings } from '@/components/ai/AgentEvolverSettings';
import { Brain, Cpu, ServerCog, Settings2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function SettingsContent() {
  const searchParams = useSearchParams();
  const [defaultTab, setDefaultTab] = useState('ai');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['ai', 'lmstudio', 'evolver'].includes(tab)) {
      setDefaultTab(tab);
    }
  }, [searchParams]);

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList className="bg-slate-800/60 text-slate-300">
        <TabsTrigger value="ai" className="data-[state=active]:text-emerald-300">
          <Brain className="w-4 h-4 mr-2" />
          AI Providers
        </TabsTrigger>
        <TabsTrigger value="lmstudio" className="data-[state=active]:text-emerald-300">
          <ServerCog className="w-4 h-4 mr-2" />
          LM Studio
        </TabsTrigger>
        <TabsTrigger value="evolver" className="data-[state=active]:text-emerald-300">
          <Cpu className="w-4 h-4 mr-2" />
          AgentEvolver
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="space-y-4">
        <AIProviderSettings />
      </TabsContent>

      <TabsContent value="lmstudio" className="space-y-4">
        <LMStudioSettings />
      </TabsContent>

      <TabsContent value="evolver" className="space-y-4">
        <AgentEvolverSettings />
      </TabsContent>
    </Tabs>
  );
}

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
                Configure AI providers, local LM Studio, and AgentEvolver without losing any options.
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
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              </div>
            }>
              <SettingsContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
