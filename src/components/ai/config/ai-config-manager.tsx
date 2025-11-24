'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Zap, Globe, Key, Save, Check, X, AlertCircle } from 'lucide-react';

interface AIConfig {
  provider: 'openrouter' | 'fallback';
  openRouter: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  fallbackEnabled: boolean;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'openrouter',
  openRouter: {
    apiKey: '',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  fallbackEnabled: true
};

const OPENROUTER_MODELS = [
  { value: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (Free)' },
  { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (Free)' },
  { value: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B (Free)' },
  { value: 'microsoft/phi-3-medium-128k-instruct:free', label: 'Phi-3 Medium (Free)' },
  { value: 'anthropic/claude-3-haiku:free', label: 'Claude 3 Haiku (Free)' },
];

interface AIConfigManagerProps {
  onConfigChange: (config: AIConfig) => void;
  children: React.ReactNode;
}

export default function AIConfigManager({ onConfigChange, children }: AIConfigManagerProps) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<string[]>([]);

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('ai-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        onConfigChange(parsed);
      } catch (error) {
        console.error('Failed to load AI config:', error);
      }
    }
  }, [onConfigChange]);

  // Save config to localStorage
  const saveConfig = (newConfig: AIConfig) => {
    setConfig(newConfig);
    localStorage.setItem('ai-config', JSON.stringify(newConfig));
    onConfigChange(newConfig);
  };

  // Test connection to configured provider
  const testConnection = async () => {
    setConnectionStatus('testing');
    setTestResults([]);

    try {
      if (config.provider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.openRouter.apiKey}`,
          },
        });

        if (response.ok) {
          const models = await response.json();
          setTestResults([`✅ Connected to OpenRouter - ${models.data?.length || 0} models available`]);
          setConnectionStatus('success');
        } else {
          throw new Error('Failed to fetch models from OpenRouter');
        }
      }
    } catch (error) {
      setTestResults([`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setConnectionStatus('error');
    }
  };

  const hasRequiredConfig = () => {
    if (config.provider === 'openrouter') {
      return config.openRouter.apiKey.trim() !== '';
    }
    return true;
  };

  return (
    <>
      {children}

      {/* Config Button */}
      <Button
        onClick={() => setIsConfiguring(true)}
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-50 bg-background border-border"
      >
        <Settings className="h-4 w-4 mr-2" />
        AI Config
      </Button>

      {/* Configuration Modal */}
      {isConfiguring && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                AI Configuration
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfiguring(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={config.provider}
                  onValueChange={(value: 'openrouter' | 'fallback') =>
                    saveConfig({ ...config, provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        OpenRouter (Cloud)
                      </div>
                    </SelectItem>
                    <SelectItem value="fallback">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Fallback Mode
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* OpenRouter Configuration */}
              {config.provider === 'openrouter' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-medium">OpenRouter Configuration</h3>

                  <div className="space-y-2">
                    <Label htmlFor="openrouter-key">API Key</Label>
                    <Input
                      id="openrouter-key"
                      type="password"
                      placeholder="Enter OpenRouter API key"
                      value={config.openRouter.apiKey}
                      onChange={(e) =>
                        saveConfig({
                          ...config,
                          openRouter: { ...config.openRouter, apiKey: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openrouter-model">Model</Label>
                    <Select
                      value={config.openRouter.model}
                      onValueChange={(value) =>
                        saveConfig({
                          ...config,
                          openRouter: { ...config.openRouter, model: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openrouter-base">Base URL</Label>
                    <Input
                      id="openrouter-base"
                      placeholder="https://openrouter.ai/api/v1"
                      value={config.openRouter.baseUrl}
                      onChange={(e) =>
                        saveConfig({
                          ...config,
                          openRouter: { ...config.openRouter, baseUrl: e.target.value }
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Fallback Mode Configuration */}
              {config.provider === 'fallback' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-medium">Fallback Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Uses predefined responses when external AI providers are unavailable.
                    This mode works offline but provides limited functionality.
                  </p>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="fallback-enabled"
                      checked={config.fallbackEnabled}
                      onCheckedChange={(checked) =>
                        saveConfig({ ...config, fallbackEnabled: checked })
                      }
                    />
                    <Label htmlFor="fallback-enabled">Enable fallback responses</Label>
                  </div>
                </div>
              )}

              {/* Connection Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Connection Status</Label>
                  <Button
                    onClick={testConnection}
                    disabled={!hasRequiredConfig() || connectionStatus === 'testing'}
                    variant="outline"
                    size="sm"
                  >
                    {connectionStatus === 'testing' && 'Testing...'}
                    {connectionStatus === 'idle' && 'Test Connection'}
                    {connectionStatus === 'success' && <Check className="h-4 w-4" />}
                    {connectionStatus === 'error' && 'Retry'}
                  </Button>
                </div>

                {testResults.length > 0 && (
                  <div className="space-y-1">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded ${
                          result.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Status */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {config.provider === 'fallback'
                    ? 'Configuration saved locally'
                    : hasRequiredConfig()
                    ? 'Ready to use'
                    : 'Please complete configuration'}
                </span>
                <Badge
                  variant={hasRequiredConfig() ? 'default' : 'destructive'}
                >
                  {hasRequiredConfig() ? 'Configured' : 'Incomplete'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}