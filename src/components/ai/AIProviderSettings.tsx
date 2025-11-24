'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Bot,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Cloud,
  Monitor,
  Eye,
  Brain,
  Sprout,
  HardDrive,
  Key,
  TestTube,
  Wifi,
  WifiOff
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  models: AIModel[];
  config: any;
  status: 'available' | 'unavailable' | 'error';
  lastChecked: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextLength?: number;
  size?: string;
  quantization?: string;
  pricing?: any;
}

interface Settings {
  aiProvider: string;
  lmStudio: {
    url: string;
    apiKey: string;
    model: string;
  };
  openRouter: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  openai: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  groq: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  agentEvolver: {
    enabled: boolean;
    evolutionLevel: string;
    learningRate: number;
    performanceThreshold: number;
    autoOptimization: boolean;
    riskTolerance: string;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  units: {
    temperature: string;
    weight: string;
  };
}

export function AIProviderSettings() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Add save state management
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempSettings, setTempSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadProviders = async (currentSettings: Settings) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai/providers');
      const data = await response.json();

      if (data.success) {
        setProviders(data.providers);

        if (currentSettings && currentSettings.aiProvider) {
          setSelectedProvider(currentSettings.aiProvider);
        } else if (data.providers.length > 0) {
          const firstAvailable = data.providers.find(p => p.status === 'available');
          if (firstAvailable) {
            setSelectedProvider(firstAvailable.id);
          }
        }
      } else {
        setError(data.error || 'Failed to load providers');
      }
    } catch (error) {
      setError('Failed to connect to providers API');
      console.error('Error loading providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setTempSettings(data.settings);
        setSelectedProvider(data.settings.aiProvider);
        setSelectedModel(data.settings.lmStudio?.model || data.settings.openRouter?.model || data.settings.openai?.model || data.settings.gemini?.model || data.settings.groq?.model || data.settings.anthropic?.model || '');
        await loadProviders(data.settings);
      } else {
        setError(data.error || 'Failed to load settings');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Failed to connect to settings API. Is the server running?');
      setIsLoading(false);
      console.error('Error loading settings:', error);
    }
  };

  const updateTempSettings = (updates: Partial<Settings>) => {
    setTempSettings(prev => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!tempSettings || !hasChanges || !settings) return;

    setIsSaving(true);
    try {
      // Update the AI provider if changed
      if (tempSettings.aiProvider !== settings.aiProvider) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'switch_provider',
            provider: tempSettings.aiProvider
          })
        });
      }

      // Update each provider's config if changed
      if (JSON.stringify(tempSettings.lmStudio) !== JSON.stringify(settings.lmStudio)) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_provider',
            provider: 'lm-studio',
            config: tempSettings.lmStudio
          })
        });
      }

      if (JSON.stringify(tempSettings.openRouter) !== JSON.stringify(settings.openRouter)) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_provider',
            provider: 'openrouter',
            config: tempSettings.openRouter
          })
        });
      }

      if (JSON.stringify(tempSettings.openai) !== JSON.stringify(settings.openai)) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_provider',
            provider: 'openai',
            config: tempSettings.openai
          })
        });
      }

      if (JSON.stringify(tempSettings.gemini) !== JSON.stringify(settings.gemini)) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_provider',
            provider: 'gemini',
            config: tempSettings.gemini
          })
        });
      }

      if (JSON.stringify(tempSettings.groq) !== JSON.stringify(settings.groq)) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_provider',
            provider: 'groq',
            config: tempSettings.groq
          })
        });
      }

      if (JSON.stringify(tempSettings.anthropic) !== JSON.stringify(settings.anthropic)) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_provider',
            provider: 'anthropic',
            config: tempSettings.anthropic
          })
        });
      }

      setSettings(tempSettings);
      setHasChanges(false);
      await loadProviders(tempSettings); // Refresh providers
      setError('');
    } catch (error) {
      setError('Failed to save settings');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = async (providerId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel(''); // Reset model when provider changes
    updateTempSettings({ aiProvider: providerId });
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);

    // Update the correct provider's model setting
    if (tempSettings) {
      if (selectedProvider === 'lm-studio') {
        updateTempSettings({ lmStudio: { ...tempSettings.lmStudio, model: modelId } });
      } else if (selectedProvider === 'openrouter') {
        updateTempSettings({ openRouter: { ...tempSettings.openRouter, model: modelId } });
      } else if (selectedProvider === 'openai-compatible') {
        updateTempSettings({ openai: { ...tempSettings.openai, model: modelId } });
      } else if (selectedProvider === 'gemini') {
        updateTempSettings({ gemini: { ...tempSettings.gemini, model: modelId } });
      } else if (selectedProvider === 'groq') {
        updateTempSettings({ groq: { ...tempSettings.groq, model: modelId } });
      } else if (selectedProvider === 'anthropic') {
        updateTempSettings({ anthropic: { ...tempSettings.anthropic, model: modelId } });
      }
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProvider || !selectedModel) {
      setError('Please select both a provider and model to test');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          providerId: selectedProvider,
          modelId: selectedModel
        })
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefresh = async () => {
    setProviders([]);
    if (settings) {
      await loadProviders(settings);
    } else {
      await loadSettings();
    }
  };

  const handleOpenRouterKeyChange = (apiKey: string) => {
    updateTempSettings({
      openRouter: { ...tempSettings?.openRouter, apiKey }
    });
  };

  const handleOpenRouterModelChange = (model: string) => {
    updateTempSettings({
      openRouter: { ...tempSettings?.openRouter, model }
    });
  };

  const handleOpenAIChange = (config: Partial<Settings['openai']>) => {
    updateTempSettings({
      openai: { ...tempSettings?.openai, ...config }
    });
  };

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'vision':
      case 'image-analysis':
        return <Eye className="h-3 w-3" />;
      case 'plant-analysis':
      case 'classification':
        return <Sprout className="h-3 w-3" />;
      case 'text-generation':
        return <Brain className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const getCapabilityColor = (capability: string) => {
    switch (capability) {
      case 'vision':
      case 'image-analysis':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'plant-analysis':
      case 'classification':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'text-generation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unavailable':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const availableModels = currentProvider?.models || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Provider Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading AI providers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-emerald-900/50 border-emerald-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-lime-300 flex items-center gap-2">
            <Bot className="h-5 w-5 mr-2 text-purple-400" />
            AI Provider Settings
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasChanges && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-emerald-300">Select AI Provider</Label>
            <Select value={selectedProvider} onValueChange={handleProviderChange}>
              <SelectTrigger className="bg-emerald-800 border-emerald-700 text-emerald-200">
                <SelectValue placeholder="Choose a provider..." />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
                      {provider.type === 'local' ? (
                        <Monitor className="h-4 w-4" />
                      ) : (
                        <Cloud className="h-4 w-4" />
                      )}
                      <span>{provider.name}</span>
                      {getStatusIcon(provider.status)}
                      <Badge variant="secondary" className="ml-auto">
                        {provider.models.length} models
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          {selectedProvider && availableModels.length > 0 && (
            <div className="space-y-2">
              <Label className="text-emerald-300">Select Model</Label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="bg-emerald-800 border-emerald-700 text-emerald-200">
                  <SelectValue placeholder="Choose a model..." />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col items-start">
                        <div className="font-medium">{model.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {model.capabilities.slice(0, 2).map((capability) => (
                            <Badge
                              key={capability}
                              variant="secondary"
                              className={`text-xs ${getCapabilityColor(capability)}`}
                            >
                              {getCapabilityIcon(capability)}
                              {capability.replace('-', ' ')}
                            </Badge>
                          ))}
                          {model.size && (
                            <Badge variant="outline" className="text-xs">
                              <HardDrive className="h-3 w-3 mr-1" />
                              {model.size}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* OpenRouter API Key */}
          {selectedProvider === 'openrouter' && (
            <div className="space-y-2">
              <Label htmlFor="openrouter-key" className="text-emerald-300">OpenRouter API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="openrouter-key"
                  type="password"
                  placeholder="Enter your OpenRouter API key"
                  value={tempSettings?.openRouter?.apiKey || ''}
                  onChange={(e) => handleOpenRouterKeyChange(e.target.value)}
                  className="bg-emerald-800 border-emerald-700 text-emerald-200"
                />
                <Button size="sm" variant="outline">
                  <Key className="h-4 w-4 mr-1" />
                  Get Key
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openrouter-model" className="text-emerald-300">Manual Model Name</Label>
                <Input
                  id="openrouter-model"
                  type="text"
                  placeholder="Enter a model name"
                  value={tempSettings?.openRouter?.model || ''}
                  onChange={(e) => handleOpenRouterModelChange(e.target.value)}
                  className="bg-emerald-800 border-emerald-700 text-emerald-200"
                />
              </div>
            </div>
          )}

          {/* OpenAI-Compatible Settings */}
          {selectedProvider === 'openai-compatible' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-emerald-300">API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={tempSettings?.openai?.apiKey || ''}
                  onChange={(e) => handleOpenAIChange({ apiKey: e.target.value })}
                  className="bg-emerald-800 border-emerald-700 text-emerald-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-url" className="text-emerald-300">Base URL</Label>
                <Input
                  id="openai-url"
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={tempSettings?.openai?.baseUrl || ''}
                  onChange={(e) => handleOpenAIChange({ baseUrl: e.target.value })}
                  className="bg-emerald-800 border-emerald-700 text-emerald-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-model" className="text-emerald-300">Model Name</Label>
                <Input
                  id="openai-model"
                  type="text"
                  placeholder="Enter the model name"
                  value={tempSettings?.openai?.model || ''}
                  onChange={(e) => handleOpenAIChange({ model: e.target.value })}
                  className="bg-emerald-800 border-emerald-700 text-emerald-200"
                />
              </div>
            </div>
          )}

          {/* Test Connection */}
          {selectedProvider && selectedModel && (
            <div className="space-y-2">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>

              {testResult && (
                <Alert className={testResult.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription className={testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                    {testResult.message}
                    {testResult.error && <span className="block mt-1">Error: {testResult.error}</span>}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Provider Status */}
          {providers.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-emerald-300">Provider Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className={`p-3 border rounded-lg ${
                      provider.id === selectedProvider
                        ? 'border-emerald-500 bg-emerald-800/50'
                        : 'border-emerald-700 bg-emerald-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {provider.type === 'local' ? (
                          <Monitor className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Cloud className="h-4 w-4 text-emerald-400" />
                        )}
                        <span className="font-medium text-emerald-200">{provider.name}</span>
                      </div>
                      {getStatusIcon(provider.status)}
                    </div>
                    <div className="text-sm text-emerald-400 mt-1">
                      {provider.models.length} models available
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}