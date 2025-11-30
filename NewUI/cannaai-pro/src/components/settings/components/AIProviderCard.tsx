import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Select from '@radix-ui/react-select';
import {
  Bot,
  Cloud,
  Monitor,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  TestTube,
  Key,
  Eye,
  EyeOff,
  Save,
  Settings as SettingsIcon,
  ExternalLink,
  Info,
  Zap,
  Brain,
  Sprout,
  HardDrive,
} from 'lucide-react';

import { useSettingsStore } from '../store';
import { AIProviderType, AIModel, ModelCapability } from '../types';

const AIProviderCard: React.FC = () => {
  const {
    settings,
    isLoading,
    isSaving,
    isTesting,
    selectedProvider,
    testResult,
    availableModels,
    switchProvider,
    updateProviderConfig,
    testProviderConnection,
    loadProviderModels,
    validateProviderConfig,
    setActiveTab,
  } = useSettingsStore();

  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [localConfigs, setLocalConfigs] = useState<Record<string, any>>({});

  const providers: Array<{
    id: AIProviderType;
    name: string;
    description: string;
    type: 'local' | 'cloud';
    icon: React.ReactNode;
    color: string;
    configPath: string;
    needsApiKey: boolean;
    baseUrl?: string;
    docsUrl?: string;
  }> = [
    {
      id: 'lm-studio',
      name: 'LM Studio',
      description: 'Local models through LM Studio',
      type: 'local',
      icon: <Monitor className="w-5 h-5" />,
      color: 'blue',
      configPath: 'lmStudio',
      needsApiKey: false,
      baseUrl: 'http://localhost:1234',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Access to various AI models',
      type: 'cloud',
      icon: <Cloud className="w-5 h-5" />,
      color: 'purple',
      configPath: 'openRouter',
      needsApiKey: true,
      baseUrl: 'https://openrouter.ai/api/v1',
      docsUrl: 'https://openrouter.ai/docs',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models and OpenAI API',
      type: 'cloud',
      icon: <Bot className="w-5 h-5" />,
      color: 'green',
      configPath: 'openai',
      needsApiKey: true,
      baseUrl: 'https://api.openai.com/v1',
      docsUrl: 'https://platform.openai.com/docs',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Google\'s Gemini AI models',
      type: 'cloud',
      icon: <Brain className="w-5 h-5" />,
      color: 'blue',
      configPath: 'gemini',
      needsApiKey: true,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      docsUrl: 'https://ai.google.dev/docs',
    },
    {
      id: 'groq',
      name: 'Groq',
      description: 'Fast inference with Groq',
      type: 'cloud',
      icon: <Zap className="w-5 h-5" />,
      color: 'orange',
      configPath: 'groq',
      needsApiKey: true,
      baseUrl: 'https://api.groq.com/openai/v1',
      docsUrl: 'https://console.groq.com/docs',
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'Claude AI models',
      type: 'cloud',
      icon: <Sprout className="w-5 h-5" />,
      color: 'emerald',
      configPath: 'anthropic',
      needsApiKey: true,
      baseUrl: 'https://ai.gigamind.dev/claude-code',
      docsUrl: 'https://docs.anthropic.com/claude/docs',
    },
  ];

  useEffect(() => {
    if (settings) {
      const configs: Record<string, any> = {};
      providers.forEach(provider => {
        configs[provider.id] = (settings as any)[provider.configPath];
      });
      setLocalConfigs(configs);
    }
  }, [settings]);

  const handleProviderSelect = async (providerId: AIProviderType) => {
    await switchProvider(providerId);
  };

  const handleConfigChange = (providerId: string, field: string, value: any) => {
    setLocalConfigs(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value,
      },
    }));
  };

  const handleSaveConfig = async (providerId: string, config: any) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (!validateProviderConfig(provider.id, config)) {
      return;
    }

    await updateProviderConfig(provider.id, config);
  };

  const handleTestConnection = async (providerId: AIProviderType) => {
    await testProviderConnection(providerId);
  };

  const handleLoadModels = async (providerId: AIProviderType) => {
    await loadProviderModels(providerId);
  };

  const getCapabilityIcon = (capability: ModelCapability) => {
    switch (capability) {
      case 'vision':
      case 'image-analysis':
        return <Eye className="w-3 h-3" />;
      case 'plant-analysis':
      case 'classification':
        return <Sprout className="w-3 h-3" />;
      case 'text-generation':
        return <Brain className="w-3 h-3" />;
      case 'code-generation':
        return <Zap className="w-3 h-3" />;
      default:
        return <Bot className="w-3 h-3" />;
    }
  };

  const getCapabilityColor = (capability: ModelCapability) => {
    switch (capability) {
      case 'vision':
      case 'image-analysis':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'plant-analysis':
      case 'classification':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'text-generation':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'code-generation':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (providerId: AIProviderType) => {
    const config = localConfigs[providerId];
    const isConnected = config?.connected || false;

    if (isTesting && selectedProvider === providerId) {
      return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
    }

    if (testResult && selectedProvider === providerId) {
      return testResult.success ? (
        <CheckCircle className="w-4 h-4 text-green-400" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-400" />
      );
    }

    return isConnected ? (
      <Wifi className="w-4 h-4 text-green-400" />
    ) : (
      <WifiOff className="w-4 h-4 text-gray-500" />
    );
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        hover: 'hover:bg-blue-500/20',
      },
      purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        hover: 'hover:bg-purple-500/20',
      },
      green: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        hover: 'hover:bg-green-500/20',
      },
      orange: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        hover: 'hover:bg-orange-500/20',
      },
      emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        hover: 'hover:bg-emerald-500/20',
      },
    };

    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              AI Provider Selection
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Choose and configure your preferred AI provider for plant analysis
            </p>
          </div>

          <Select.Root value={selectedProvider || ''} onValueChange={handleProviderSelect}>
            <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors">
              <Select.Value placeholder="Select provider" />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-gray-800 border border-gray-700 rounded-lg p-2 z-50">
                {providers.map((provider) => {
                  const colors = getColorClasses(provider.color);
                  return (
                    <Select.Item
                      key={provider.id}
                      value={provider.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-white hover:bg-gray-700 cursor-pointer transition-colors ${selectedProvider === provider.id ? 'bg-emerald-600/20 border border-emerald-600/50' : ''}`}
                    >
                      <div className={`p-1 rounded ${colors.bg} ${colors.border}`}>
                        {provider.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-xs text-gray-400">{provider.description}</div>
                      </div>
                      {getStatusIcon(provider.id)}
                    </Select.Item>
                  );
                })}
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => {
            const config = localConfigs[provider.id] || {};
            const colors = getColorClasses(provider.color);
            const isSelected = selectedProvider === provider.id;

            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                className={`relative bg-gray-800/50 border rounded-xl p-4 transition-all cursor-pointer ${
                  isSelected
                    ? `border-emerald-500/50 ${colors.bg}`
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => handleProviderSelect(provider.id)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${colors.bg} ${colors.border}`}>
                      {provider.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{provider.name}</h3>
                      <p className="text-xs text-gray-400">{provider.type}</p>
                    </div>
                  </div>
                  {getStatusIcon(provider.id)}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4">{provider.description}</p>

                {/* Configuration Form */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t border-gray-700"
                  >
                    {/* API Key for cloud providers */}
                    {provider.needsApiKey && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey[provider.id] ? 'text' : 'password'}
                            value={config.apiKey || ''}
                            onChange={(e) => handleConfigChange(provider.id, 'apiKey', e.target.value)}
                            placeholder={`Enter your ${provider.name} API key`}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white pr-10"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowApiKey(prev => ({
                                ...prev,
                                [provider.id]: !prev[provider.id],
                              }));
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                          >
                            {showApiKey[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Base URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={config.baseUrl || provider.baseUrl || ''}
                        onChange={(e) => handleConfigChange(provider.id, 'baseUrl', e.target.value)}
                        placeholder="API base URL"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>

                    {/* Model Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Model
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadModels(provider.id);
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Refresh
                        </button>
                      </div>
                      <Select.Root
                        value={config.model || ''}
                        onValueChange={(value) => handleConfigChange(provider.id, 'model', value)}
                      >
                        <Select.Trigger className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                          <Select.Value placeholder="Select model" />
                          <Select.Icon />
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content className="bg-gray-800 border border-gray-700 rounded-lg p-2 z-50 max-h-60 overflow-y-auto">
                            {availableModels[provider.id]?.map((model) => (
                              <Select.Item
                                key={model.id}
                                value={model.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-white hover:bg-gray-700 cursor-pointer transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{model.name}</div>
                                  <div className="flex items-center gap-1 mt-1">
                                    {model.capabilities.slice(0, 2).map((capability) => (
                                      <span
                                        key={capability}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border ${getCapabilityColor(capability)}`}
                                      >
                                        {getCapabilityIcon(capability)}
                                        {capability.replace('-', ' ')}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveConfig(provider.id, config);
                        }}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(provider.id);
                        }}
                        disabled={isTesting}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        {isTesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                        Test
                      </button>
                    </div>

                    {/* Documentation Link */}
                    {provider.docsUrl && (
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        <Info className="w-4 h-4" />
                        Documentation
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Test Result */}
      <AnimatePresence>
        {testResult && selectedProvider && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl border ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </h4>
                <p className="text-sm text-gray-400">{testResult.message}</p>
                {testResult.details && Object.keys(testResult.details).length > 0 && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded-lg">
                    <pre className="text-xs text-gray-300">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LM Studio Quick Access */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            LM Studio Setup
          </h3>
          <button
            onClick={() => setActiveTab('lm-studio')}
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            Configure LM Studio
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-400 text-sm">
          Configure local AI models through LM Studio. Download models in LM Studio and configure the connection here.
        </p>
      </div>
    </div>
  );
};

export default AIProviderCard;