'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Brain,
  Bot,
  Globe,
  Wifi,
  Zap,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Bell,
  BellOff,
  Lock,
  Shield,
  Database,
  Trash2,
  Download,
  Upload,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  Sliders,
  Palette,
  Type,
  MessageSquare,
  Image as ImageIcon,
  Mic,
  Hash,
  BarChart3,
  Clock,
  Cpu
} from 'lucide-react';

import { ChatSettings as IChatSettings } from './types';

interface ChatSettingsProps {
  settings: IChatSettings;
  onSettingsChange: (settings: IChatSettings) => void;
  onSettingsChangeComplete?: (settings: IChatSettings) => void;
  onResetSettings?: () => void;
  onExportSettings?: () => void;
  onImportSettings?: (file: File) => void;
  className?: string;
}

export function ChatSettings({
  settings,
  onSettingsChange,
  onSettingsChangeComplete,
  onResetSettings,
  onExportSettings,
  onImportSettings,
  className = ''
}: ChatSettingsProps) {
  const [activeTab, setActiveTab] = useState<'providers' | 'ui' | 'features' | 'privacy' | 'notifications'>('providers');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Update settings
  const updateSetting = (category: keyof IChatSettings, key: string, value: any) => {
    const updatedSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    onSettingsChange(updatedSettings);
  };

  // Test provider connection
  const testProvider = async (provider: 'lm-studio' | 'openrouter') => {
    setIsTesting(provider);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Connection test',
          testProvider: provider
        })
      });

      const success = response.ok;
      setTestResults(prev => ({ ...prev, [provider]: success }));
    } catch {
      setTestResults(prev => ({ ...prev, [provider]: false }));
    } finally {
      setIsTesting(null);
    }
  };

  // Save and close
  const handleSaveAndClose = () => {
    onSettingsChangeComplete?.(settings);
  };

  const tabs = [
    { id: 'providers', label: 'AI Providers', icon: Brain },
    { id: 'ui', label: 'Interface', icon: Palette },
    { id: 'features', label: 'Features', icon: Sliders },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Chat Settings</h2>
          </div>
          <div className="flex items-center gap-2">
            {onResetSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetSettings}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            {onExportSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportSettings}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            {onImportSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) onImportSettings(file);
                  };
                  input.click();
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            )}
            <Button
              onClick={handleSaveAndClose}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Tabs */}
        <div className="w-64 border-r border-gray-700 p-4">
          <div className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {/* AI Providers Tab */}
            {activeTab === 'providers' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Provider Configuration
                </h3>

                {/* LM Studio Settings */}
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-400" />
                      <h4 className="text-lg font-medium text-white">LM Studio</h4>
                      <span className="px-2 py-1 bg-gray-600 text-xs rounded">Local</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {testResults['lm-studio'] !== undefined && (
                        <span className={`flex items-center gap-1 text-sm ${
                          testResults['lm-studio'] ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {testResults['lm-studio'] ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          {testResults['lm-studio'] ? 'Connected' : 'Failed'}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testProvider('lm-studio')}
                        disabled={isTesting === 'lm-studio'}
                        className="border-gray-600 text-gray-300"
                      >
                        {isTesting === 'lm-studio' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-300">Enable LM Studio</label>
                      <Switch
                        checked={settings.providers.lmStudio.enabled}
                        onCheckedChange={(checked) => updateSetting('providers', 'lmStudio', { ...settings.providers.lmStudio, enabled: checked })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Server URL</label>
                      <input
                        type="text"
                        value={settings.providers.lmStudio.url}
                        onChange={(e) => updateSetting('providers', 'lmStudio', { ...settings.providers.lmStudio, url: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                        placeholder="http://localhost:1234"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Model</label>
                      <input
                        type="text"
                        value={settings.providers.lmStudio.model}
                        onChange={(e) => updateSetting('providers', 'lmStudio', { ...settings.providers.lmStudio, model: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                        placeholder="granite-4.0-micro"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Temperature: {settings.providers.lmStudio.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.providers.lmStudio.temperature}
                        onChange={(e) => updateSetting('providers', 'lmStudio', { ...settings.providers.lmStudio, temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Max Tokens: {settings.providers.lmStudio.maxTokens}
                      </label>
                      <input
                        type="range"
                        min="512"
                        max="4096"
                        step="256"
                        value={settings.providers.lmStudio.maxTokens}
                        onChange={(e) => updateSetting('providers', 'lmStudio', { ...settings.providers.lmStudio, maxTokens: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* OpenRouter Settings */}
                <div className="bg-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-green-400" />
                      <h4 className="text-lg font-medium text-white">OpenRouter</h4>
                      <span className="px-2 py-1 bg-gray-600 text-xs rounded">Cloud</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {testResults['openrouter'] !== undefined && (
                        <span className={`flex items-center gap-1 text-sm ${
                          testResults['openrouter'] ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {testResults['openrouter'] ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          {testResults['openrouter'] ? 'Connected' : 'Failed'}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testProvider('openrouter')}
                        disabled={isTesting === 'openrouter'}
                        className="border-gray-600 text-gray-300"
                      >
                        {isTesting === 'openrouter' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-300">Enable OpenRouter</label>
                      <Switch
                        checked={settings.providers.openRouter.enabled}
                        onCheckedChange={(checked) => updateSetting('providers', 'openRouter', { ...settings.providers.openRouter, enabled: checked })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">API Key</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={settings.providers.openRouter.apiKey}
                          onChange={(e) => updateSetting('providers', 'openRouter', { ...settings.providers.openRouter, apiKey: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white pr-10"
                          placeholder="Enter your OpenRouter API key"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Model</label>
                      <select
                        value={settings.providers.openRouter.model}
                        onChange={(e) => updateSetting('providers', 'openRouter', { ...settings.providers.openRouter, model: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                      >
                        <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free)</option>
                        <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                        <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                        <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
                        <option value="openai/gpt-4">GPT-4</option>
                        <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Temperature: {settings.providers.openRouter.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.providers.openRouter.temperature}
                        onChange={(e) => updateSetting('providers', 'openRouter', { ...settings.providers.openRouter, temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Max Tokens: {settings.providers.openRouter.maxTokens}
                      </label>
                      <input
                        type="range"
                        min="512"
                        max="4096"
                        step="256"
                        value={settings.providers.openRouter.maxTokens}
                        onChange={(e) => updateSetting('providers', 'openRouter', { ...settings.providers.openRouter, maxTokens: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* UI Tab */}
            {activeTab === 'ui' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Interface Settings
                </h3>

                <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Theme</label>
                    <select
                      value={settings.ui.theme}
                      onChange={(e) => updateSetting('ui', 'theme', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Font Size</label>
                    <select
                      value={settings.ui.fontSize}
                      onChange={(e) => updateSetting('ui', 'fontSize', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Message Style</label>
                    <select
                      value={settings.ui.messageStyle}
                      onChange={(e) => updateSetting('ui', 'messageStyle', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                    >
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                      <option value="spacious">Spacious</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-300">Show Timestamps</label>
                      <Switch
                        checked={settings.ui.showTimestamps}
                        onCheckedChange={(checked) => updateSetting('ui', 'showTimestamps', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-gray-300">Show Model Info</label>
                      <Switch
                        checked={settings.ui.showModelInfo}
                        onCheckedChange={(checked) => updateSetting('ui', 'showModelInfo', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-gray-300">Show Processing Time</label>
                      <Switch
                        checked={settings.ui.showProcessingTime}
                        onCheckedChange={(checked) => updateSetting('ui', 'showProcessingTime', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-gray-300">Enable Sound Effects</label>
                      <Switch
                        checked={settings.ui.enableSoundEffects}
                        onCheckedChange={(checked) => updateSetting('ui', 'enableSoundEffects', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-gray-300">Enable Animations</label>
                      <Switch
                        checked={settings.ui.enableAnimations}
                        onCheckedChange={(checked) => updateSetting('ui', 'enableAnimations', checked)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5" />
                  Feature Settings
                </h3>

                <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-blue-400" />
                      <label className="text-gray-300">Voice Input</label>
                    </div>
                    <Switch
                      checked={settings.features.enableVoiceInput}
                      onCheckedChange={(checked) => updateSetting('features', 'enableVoiceInput', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-green-400" />
                      <label className="text-gray-300">Voice Output</label>
                    </div>
                    <Switch
                      checked={settings.features.enableVoiceOutput}
                      onCheckedChange={(checked) => updateSetting('features', 'enableVoiceOutput', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <label className="text-gray-300">Image Analysis</label>
                    </div>
                    <Switch
                      checked={settings.features.enableImageAnalysis}
                      onCheckedChange={(checked) => updateSetting('features', 'enableImageAnalysis', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-yellow-400" />
                      <label className="text-gray-300">File Sharing</label>
                    </div>
                    <Switch
                      checked={settings.features.enableFileSharing}
                      onCheckedChange={(checked) => updateSetting('features', 'enableFileSharing', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-cyan-400" />
                      <label className="text-gray-300">Quick Templates</label>
                    </div>
                    <Switch
                      checked={settings.features.enableQuickTemplates}
                      onCheckedChange={(checked) => updateSetting('features', 'enableQuickTemplates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <label className="text-gray-300">Conversation History</label>
                    </div>
                    <Switch
                      checked={settings.features.enableConversationHistory}
                      onCheckedChange={(checked) => updateSetting('features', 'enableConversationHistory', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-red-400" />
                      <label className="text-gray-300">Analytics</label>
                    </div>
                    <Switch
                      checked={settings.features.enableAnalytics}
                      onCheckedChange={(checked) => updateSetting('features', 'enableAnalytics', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      <label className="text-gray-300">Real-time Sync</label>
                    </div>
                    <Switch
                      checked={settings.features.enableRealTimeSync}
                      onCheckedChange={(checked) => updateSetting('features', 'enableRealTimeSync', checked)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy Settings
                </h3>

                <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-400" />
                      <label className="text-gray-300">Save Chat History</label>
                    </div>
                    <Switch
                      checked={settings.privacy.saveHistory}
                      onCheckedChange={(checked) => updateSetting('privacy', 'saveHistory', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-400" />
                      <label className="text-gray-300">Enable Data Analysis</label>
                    </div>
                    <Switch
                      checked={settings.privacy.enableDataAnalysis}
                      onCheckedChange={(checked) => updateSetting('privacy', 'enableDataAnalysis', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <label className="text-gray-300">Share Anonymous Usage</label>
                    </div>
                    <Switch
                      checked={settings.privacy.shareAnonymousUsage}
                      onCheckedChange={(checked) => updateSetting('privacy', 'shareAnonymousUsage', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-yellow-400" />
                      <label className="text-gray-300">Encrypt Local Storage</label>
                    </div>
                    <Switch
                      checked={settings.privacy.encryptLocalStorage}
                      onCheckedChange={(checked) => updateSetting('privacy', 'encryptLocalStorage', checked)}
                    />
                  </div>

                  {settings.privacy.autoDeleteAfterDays && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Auto-delete after {settings.privacy.autoDeleteAfterDays} days
                      </label>
                      <input
                        type="range"
                        min="7"
                        max="365"
                        step="7"
                        value={settings.privacy.autoDeleteAfterDays}
                        onChange={(e) => updateSetting('privacy', 'autoDeleteAfterDays', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Settings
                </h3>

                <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <label className="text-gray-300">Desktop Notifications</label>
                    </div>
                    <Switch
                      checked={settings.notifications.desktopNotifications}
                      onCheckedChange={(checked) => updateSetting('notifications', 'desktopNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-green-400" />
                      <label className="text-gray-300">Sound Alerts</label>
                    </div>
                    <Switch
                      checked={settings.notifications.soundAlerts}
                      onCheckedChange={(checked) => updateSetting('notifications', 'soundAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-yellow-400" />
                      <label className="text-gray-300">Response Alerts</label>
                    </div>
                    <Switch
                      checked={settings.notifications.responseAlerts}
                      onCheckedChange={(checked) => updateSetting('notifications', 'responseAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <label className="text-gray-300">Error Alerts</label>
                    </div>
                    <Switch
                      checked={settings.notifications.errorAlerts}
                      onCheckedChange={(checked) => updateSetting('notifications', 'errorAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-purple-400" />
                      <label className="text-gray-300">Maintenance Alerts</label>
                    </div>
                    <Switch
                      checked={settings.notifications.maintenanceAlerts}
                      onCheckedChange={(checked) => updateSetting('notifications', 'maintenanceAlerts', checked)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default ChatSettings;