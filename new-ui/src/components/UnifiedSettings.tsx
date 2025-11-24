'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Cpu,
  ServerCog,
  Settings2,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Loader2,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  TestTube,
  Rocket,
  Globe,
  Zap,
  Database,
  Key,
  Shield,
  Play,
  Pause,
  Download,
  Upload,
  FlaskConical,
  Bug,
  Thermometer
} from 'lucide-react';

import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { Switch } from './ui/Switch';
import { Separator } from './ui/Separator';
import { Alert } from './ui/Alert';
import { Progress } from './ui/Progress';

import { Settings, Notification } from '../types';
import { apiClient, getErrorMessage } from '../services/api';

interface UnifiedSettingsProps {
  onNotification?: (notification: Notification) => void;
  className?: string;
}

// Tab icons mapping
const TAB_ICONS = {
  ai: Brain,
  lmstudio: ServerCog,
  evolver: Cpu
};

// AI Provider Settings Component
function AIProviderSettings({
  settings,
  onUpdate,
  onTest,
  onNotification
}: {
  settings: any;
  onUpdate: (updates: any) => void;
  onTest: (provider: string) => Promise<void>;
  onNotification: (notification: Notification) => void;
}) {
  const [testing, setTesting] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const providers = [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Access multiple AI models through OpenRouter',
      required: ['apiKey'],
      optional: ['model', 'baseUrl']
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'Direct access to Claude models',
      required: ['apiKey'],
      optional: ['model', 'baseUrl']
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'Access GPT models directly',
      required: ['apiKey'],
      optional: ['model', 'baseUrl']
    },
    {
      id: 'groq',
      name: 'Groq',
      description: 'High-speed inference with Groq',
      required: ['apiKey'],
      optional: ['model', 'baseUrl']
    },
    {
      id: 'together',
      name: 'Together AI',
      description: 'Open source models platform',
      required: ['apiKey'],
      optional: ['model', 'baseUrl']
    }
  ];

  const handleTestProvider = async (providerId: string) => {
    setTesting(providerId);
    try {
      await onTest(providerId);
      onNotification({
        id: Date.now(),
        type: 'info',
        message: `${providerId} connection test successful`,
        time: 'Just now'
      });
    } catch (error) {
      onNotification({
        id: Date.now(),
        type: 'error',
        message: `${providerId} connection test failed: ${getErrorMessage(error)}`,
        time: 'Just now'
      });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-100">AI Providers</h3>
          <p className="text-sm text-slate-400">Configure your AI service providers and API keys</p>
        </div>
        <Button
          variant="outline"
          onClick={() => onTest('all')}
          disabled={testing !== null}
        >
          {testing === 'all' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <TestTube className="w-4 h-4 mr-2" />
          )}
          Test All
        </Button>
      </div>

      {providers.map((provider) => {
        const providerSettings = settings.aiProviders?.[provider.id] || {};
        const isEnabled = providerSettings.enabled || false;

        return (
          <Card key={provider.id} className="border-slate-800 bg-slate-900/40">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  <div>
                    <h4 className="text-medium font-medium text-slate-100">{provider.name}</h4>
                    <p className="text-xs text-slate-400">{provider.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTestProvider(provider.id)}
                    disabled={testing !== null}
                  >
                    {testing === provider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(enabled) =>
                      onUpdate({
                        aiProviders: {
                          ...settings.aiProviders,
                          [provider.id]: { ...providerSettings, enabled }
                        }
                      })
                    }
                  />
                </div>
              </div>
            </Card.Header>

            <Card.Content className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label className="text-slate-300">API Key</Label>
                <div className="flex space-x-2">
                  <Input
                    type={showApiKeys[provider.id] ? 'text' : 'password'}
                    value={providerSettings.apiKey || ''}
                    onChange={(e) =>
                      onUpdate({
                        aiProviders: {
                          ...settings.aiProviders,
                          [provider.id]: { ...providerSettings, apiKey: e.target.value }
                        }
                      })
                    }
                    placeholder={`Enter ${provider.name} API key`}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setShowApiKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))
                    }
                  >
                    {showApiKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label className="text-slate-300">Model</Label>
                <Select
                  value={providerSettings.model || ''}
                  onValueChange={(model) =>
                    onUpdate({
                      aiProviders: {
                        ...settings.aiProviders,
                        [provider.id]: { ...providerSettings, model }
                      }
                    })
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select model" />
                  </Select.Trigger>
                  <Select.Content>
                    {/* Model options would be populated based on provider */}
                    <Select.Item value="auto">Auto-detect</Select.Item>
                    <Select.Item value="claude-3-sonnet">Claude 3 Sonnet</Select.Item>
                    <Select.Item value="claude-3-opus">Claude 3 Opus</Select.Item>
                    <Select.Item value="gpt-4">GPT-4</Select.Item>
                    <Select.Item value="gpt-4-turbo">GPT-4 Turbo</Select.Item>
                    <Select.Item value="llama-2-70b">Llama 2 70B</Select.Item>
                  </Select.Content>
                </Select>
              </div>

              {/* Base URL (optional) */}
              <div className="space-y-2">
                <Label className="text-slate-300">Base URL (Optional)</Label>
                <Input
                  value={providerSettings.baseUrl || ''}
                  onChange={(e) =>
                    onUpdate({
                      aiProviders: {
                        ...settings.aiProviders,
                        [provider.id]: { ...providerSettings, baseUrl: e.target.value }
                      }
                    })
                  }
                  placeholder="Custom base URL for the provider"
                />
              </div>

              {/* Additional options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Temperature</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={providerSettings.temperature || 0.7}
                    onChange={(e) =>
                      onUpdate({
                        aiProviders: {
                          ...settings.aiProviders,
                          [provider.id]: { ...providerSettings, temperature: parseFloat(e.target.value) }
                        }
                      })
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Max Tokens</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100000"
                    value={providerSettings.maxTokens || 4000}
                    onChange={(e) =>
                      onUpdate({
                        aiProviders: {
                          ...settings.aiProviders,
                          [provider.id]: { ...providerSettings, maxTokens: parseInt(e.target.value) }
                        }
                      })
                  />
                </div>
              </div>
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}

// LM Studio Settings Component
function LMStudioSettings({
  settings,
  onUpdate,
  onNotification
}: {
  settings: any;
  onUpdate: (updates: any) => void;
  onNotification: (notification: Notification) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);

  const lmStudioSettings = settings.lmStudio || {};

  const checkConnection = async () => {
    setLoading(true);
    try {
      const status = await apiClient.getLMStudioStatus();
      setIsConnected(status.connected);
      if (status.models) {
        setModels(status.models);
      }
      onNotification({
        id: Date.now(),
        type: isConnected ? 'info' : 'error',
        message: status.connected ? 'LM Studio connected' : 'LM Studio not accessible',
        time: 'Just now'
      });
    } catch (error) {
      setIsConnected(false);
      setModels([]);
      onNotification({
        id: Date.now(),
        type: 'error',
        message: `LM Studio connection failed: ${getErrorMessage(error)}`,
        time: 'Just now'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    if (!isConnected) {
      onNotification({
        id: Date.now(),
        type: 'alert',
        message: 'Connect to LM Studio first',
        time: 'Just now'
      });
      return;
    }

    try {
      const response = await apiClient.getLMStudioModels();
      setModels(response.models || []);
    } catch (error) {
      onNotification({
        id: Date.now(),
        type: 'error',
        message: `Failed to load models: ${getErrorMessage(error)}`,
        time: 'Just now'
      });
    }
  };

  const testModel = async (modelId: string) => {
    setTestingModel(modelId);
    try {
      await apiClient.sendLMStudioMessage({
        message: 'Hello, this is a test message.',
        model: modelId
      });
      onNotification({
        id: Date.now(),
        type: 'info',
        message: `Model ${modelId} test successful`,
        time: 'Just now'
      });
    } catch (error) {
      onNotification({
        id: Date.now(),
        type: 'error',
        message: `Model test failed: ${getErrorMessage(error)}`,
        time: 'Just now'
      });
    } finally {
      setTestingModel(null);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-100">LM Studio Configuration</h3>
          <p className="text-sm text-slate-400">Configure local AI model hosting with LM Studio</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={isConnected ? 'bg-emerald-600' : 'bg-red-600'}>
            {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button
            variant="outline"
            onClick={checkConnection}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Check Connection
          </Button>
        </div>
      </div>

      {/* Connection Settings */}
      <Card className="border-slate-800 bg-slate-900/40">
        <Card.Header>
          <h4 className="text-medium font-medium text-slate-100">Connection Settings</h4>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Host</Label>
              <Input
                value={lmStudioSettings.host || 'localhost'}
                onChange={(e) =>
                  onUpdate({
                    lmStudio: { ...lmStudioSettings, host: e.target.value }
                  })
                }
                placeholder="localhost"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Port</Label>
              <Input
                type="number"
                value={lmStudioSettings.port || 1234}
                onChange={(e) =>
                  onUpdate({
                    lmStudio: { ...lmStudioSettings, port: parseInt(e.target.value) }
                  })
                }
                placeholder="1234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">API Base URL</Label>
            <Input
              value={`http://${lmStudioSettings.host || 'localhost'}:${lmStudioSettings.port || 1234}/v1`}
              readOnly
              className="bg-slate-800/50"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-slate-300">Auto-connect</Label>
              <p className="text-xs text-slate-500">Automatically connect on startup</p>
            </div>
            <Switch
              checked={lmStudioSettings.autoConnect || false}
              onCheckedChange={(autoConnect) =>
                onUpdate({
                  lmStudio: { ...lmStudioSettings, autoConnect }
                })
              }
            />
          </div>
        </Card.Content>
      </Card>

      {/* Available Models */}
      <Card className="border-slate-800 bg-slate-900/40">
        <Card.Header>
          <div className="flex items-center justify-between">
            <h4 className="text-medium font-medium text-slate-100">Available Models</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={loadModels}
              disabled={!isConnected || loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Models
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {models.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ServerCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No models available</p>
              <p className="text-sm mt-2">
                {!isConnected ? 'Connect to LM Studio first' : 'Load some models in LM Studio'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {models.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-3 border border-slate-700 rounded-lg bg-slate-800/30">
                  <div className="flex items-center space-x-3">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{model.name}</p>
                      <p className="text-xs text-slate-500">
                        {model.size && `${model.size} • `}
                        {model.type}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testModel(model.id)}
                    disabled={testingModel === model.id}
                  >
                    {testingModel === model.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Model Configuration */}
      <Card className="border-slate-800 bg-slate-900/40">
        <Card.Header>
          <h4 className="text-medium font-medium text-slate-100">Default Model Settings</h4>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={lmStudioSettings.temperature || 0.7}
                onChange={(e) =>
                  onUpdate({
                    lmStudio: { ...lmStudioSettings, temperature: parseFloat(e.target.value) }
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Max Tokens</Label>
              <Input
                type="number"
                min="1"
                max="100000"
                value={lmStudioSettings.maxTokens || 4000}
                onChange={(e) =>
                  onUpdate({
                    lmStudio: { ...lmStudioSettings, maxTokens: parseInt(e.target.value) }
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">System Prompt</Label>
            <Textarea
              value={lmStudioSettings.systemPrompt || ''}
              onChange={(e) =>
                onUpdate({
                  lmStudio: { ...lmStudioSettings, systemPrompt: e.target.value }
                })
              }
              placeholder="You are a helpful cannabis cultivation assistant..."
              className="min-h-[100px]"
            />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

// AgentEvolver Settings Component
function AgentEvolverSettings({
  settings,
  onUpdate,
  onNotification
}: {
  settings: any;
  onUpdate: (updates: any) => void;
  onNotification: (notification: Notification) => void;
}) {
  const agentEvolverSettings = settings.agentEvolver || {};

  const evolvers = [
    {
      id: 'nutrient',
      name: 'Nutrient Management Agent',
      description: 'Specializes in nutrient deficiencies and excesses',
      icon: FlaskConical
    },
    {
      id: 'pest',
      name: 'Pest & Disease Agent',
      description: 'Expert in pest identification and treatment',
      icon: Bug
    },
    {
      id: 'environment',
      name: 'Environmental Control Agent',
      description: 'Optimizes growing conditions',
      icon: Thermometer
    },
    {
      id: 'genetics',
      name: 'Strain Genetics Agent',
      description: 'Knowledge about cannabis strains and genetics',
      icon: Database
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-100">AgentEvolver Configuration</h3>
          <p className="text-sm text-slate-400">Configure specialized AI agents for different aspects of cultivation</p>
        </div>
        <Switch
          checked={agentEvolverSettings.enabled || false}
          onCheckedChange={(enabled) =>
            onUpdate({
              agentEvolver: { ...agentEvolverSettings, enabled }
            })
          }
        />
      </div>

      {!agentEvolverSettings.enabled && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>AgentEvolver Disabled</AlertTitle>
          <AlertDescription>
            Enable AgentEvolver to use specialized AI agents for different cultivation aspects.
          </AlertDescription>
        </Alert>
      )}

      {evolvers.map((evolver) => {
        const evolverSettings = agentEvolverSettings.agents?.[evolver.id] || {};
        const Icon = evolver.icon;
        const isConfigured = evolverSettings.configured || false;

        return (
          <Card key={evolver.id} className="border-slate-800 bg-slate-900/40">
            <Card.Header>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isConfigured ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
                  <Icon className={`w-5 h-5 ${isConfigured ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-medium font-medium text-slate-100">{evolver.name}</h4>
                  <p className="text-xs text-slate-400">{evolver.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {isConfigured && (
                    <Badge className="bg-emerald-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                  <Switch
                    checked={evolverSettings.enabled || false}
                    onCheckedChange={(enabled) =>
                      onUpdate({
                        agentEvolver: {
                          ...agentEvolverSettings,
                          agents: {
                            ...agentEvolverSettings.agents,
                            [evolver.id]: { ...evolverSettings, enabled }
                          }
                        }
                      })
                    }
                    disabled={!agentEvolverSettings.enabled}
                  />
                </div>
              </div>
            </Card.Header>

            <Card.Content className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Priority</Label>
                  <Select
                    value={evolverSettings.priority || 'medium'}
                    onValueChange={(priority) =>
                      onUpdate({
                        agentEvolver: {
                          ...agentEvolverSettings,
                          agents: {
                            ...agentEvolverSettings.agents,
                            [evolver.id]: { ...evolverSettings, priority }
                          }
                        }
                      })
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="low">Low</Select.Item>
                      <Select.Item value="medium">Medium</Select.Item>
                      <Select.Item value="high">High</Select.Item>
                      <Select.Item value="critical">Critical</Select.Item>
                    </Select.Content>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Confidence Threshold</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={evolverSettings.confidenceThreshold || 0.7}
                    onChange={(e) =>
                      onUpdate({
                        agentEvolver: {
                          ...agentEvolverSettings,
                          agents: {
                            ...agentEvolverSettings.agents,
                            [evolver.id]: { ...evolverSettings, confidenceThreshold: parseFloat(e.target.value) }
                          }
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Custom Instructions</Label>
                <Textarea
                  value={evolverSettings.instructions || ''}
                  onChange={(e) =>
                    onUpdate({
                      agentEvolver: {
                        ...agentEvolverSettings,
                        agents: {
                          ...agentEvolverSettings.agents,
                          [evolver.id]: { ...evolverSettings, instructions: e.target.value }
                        }
                      }
                    })
                  }
                  placeholder={`Specific instructions for the ${evolver.name}...`}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-slate-300">Auto-activate</Label>
                  <p className="text-xs text-slate-500">Automatically use this agent when relevant</p>
                </div>
                <Switch
                  checked={evolverSettings.autoActivate || false}
                  onCheckedChange={(autoActivate) =>
                    onUpdate({
                      agentEvolver: {
                        ...agentEvolverSettings,
                        agents: {
                          ...agentEvolverSettings.agents,
                          [evolver.id]: { ...evolverSettings, autoActivate }
                        }
                      }
                    })
                  }
                  disabled={!agentEvolverSettings.enabled}
                />
              </div>
            </Card.Content>
          </Card>
        );
      })}

      {/* Global Settings */}
      <Card className="border-slate-800 bg-slate-900/40">
        <Card.Header>
          <h4 className="text-medium font-medium text-slate-100">Global Settings</h4>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Max Concurrent Agents</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={agentEvolverSettings.maxConcurrentAgents || 3}
                onChange={(e) =>
                  onUpdate({
                    agentEvolver: { ...agentEvolverSettings, maxConcurrentAgents: parseInt(e.target.value) }
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Agent Timeout (seconds)</Label>
              <Input
                type="number"
                min="5"
                max="300"
                value={agentEvolverSettings.timeout || 30}
                onChange={(e) =>
                  onUpdate({
                    agentEvolver: { ...agentEvolverSettings, timeout: parseInt(e.target.value) }
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-slate-300">Enable Logging</Label>
              <p className="text-xs text-slate-500">Log agent decisions and reasoning</p>
            </div>
            <Switch
              checked={agentEvolverSettings.enableLogging || false}
              onCheckedChange={(enableLogging) =>
                onUpdate({
                  agentEvolver: { ...agentEvolverSettings, enableLogging }
                })
              }
              disabled={!agentEvolverSettings.enabled}
            />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

export function UnifiedSettings({ onNotification, className = '' }: UnifiedSettingsProps) {
  const [activeTab, setActiveTab] = useState('ai');
  const [settings, setSettings] = useState<Settings>({
    aiProviders: {},
    lmStudio: {},
    agentEvolver: { enabled: false }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await apiClient.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      onNotification?.({
        id: Date.now(),
        type: 'error',
        message: `Failed to load settings: ${getErrorMessage(error)}`,
        time: 'Just now'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      await apiClient.updateSettings(settings);
      setHasChanges(false);
      onNotification?.({
        id: Date.now(),
        type: 'info',
        message: 'Settings saved successfully',
        time: 'Just now'
      });
    } catch (error) {
      onNotification?.({
        id: Date.now(),
        type: 'error',
        message: `Failed to save settings: ${getErrorMessage(error)}`,
        time: 'Just now'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testProvider = async (providerId: string) => {
    if (providerId === 'all') {
      // Test all enabled providers
      const enabledProviders = Object.keys(settings.aiProviders).filter(
        id => settings.aiProviders[id].enabled
      );

      for (const providerId of enabledProviders) {
        try {
          await apiClient.updateAIProviders({
            ...settings.aiProviders,
            [providerId]: { ...settings.aiProviders[providerId], test: true }
          });
        } catch (error) {
          console.error(`Failed to test ${providerId}:`, error);
        }
      }
    } else {
      // Test specific provider
      await apiClient.updateAIProviders({
        ...settings.aiProviders,
        [providerId]: { ...settings.aiProviders[providerId], test: true }
      });
    }
  };

  const tabs = [
    { id: 'ai', label: 'AI Providers', icon: Brain },
    { id: 'lmstudio', label: 'LM Studio', icon: ServerCog },
    { id: 'evolver', label: 'AgentEvolver', icon: Cpu }
  ];

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Settings2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Unified Settings</h1>
              <p className="text-slate-400">
                Configure AI providers, local LM Studio, and AgentEvolver with comprehensive options.
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Badge className="bg-amber-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload
            </Button>
            <Button
              onClick={saveSettings}
              disabled={isLoading || !hasChanges}
              loading={isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'ai' && (
                  <AIProviderSettings
                    settings={settings}
                    onUpdate={updateSettings}
                    onTest={testProvider}
                    onNotification={(notification) => onNotification?.(notification)}
                  />
                )}
                {activeTab === 'lmstudio' && (
                  <LMStudioSettings
                    settings={settings}
                    onUpdate={updateSettings}
                    onNotification={(notification) => onNotification?.(notification)}
                  />
                )}
                {activeTab === 'evolver' && (
                  <AgentEvolverSettings
                    settings={settings}
                    onUpdate={updateSettings}
                    onNotification={(notification) => onNotification?.(notification)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
}