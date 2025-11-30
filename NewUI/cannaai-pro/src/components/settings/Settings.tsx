import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';
import * as Progress from '@radix-ui/react-progress';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
  Settings as SettingsIcon,
  Bot,
  Cpu,
  Brain,
  Monitor,
  Cloud,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  TestTube,
  Save,
  X,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Eye,
  EyeOff,
  Bell,
  Volume2,
  VolumeX,
  Globe,
  Shield,
  Database,
  Zap,
  FileText,
  BarChart3,
  Activity,
  TrendingUp,
  Target,
  Clock,
  Lightbulb,
  Key,
  HardDrive,
  Thermometer,
  Weight,
  Ruler,
  Gauge,
  Sun,
  Moon,
  Monitor as DisplayIcon,
  Smartphone,
  Mail,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Info,
  Copy,
  ExternalLink,
} from 'lucide-react';

import { useSettingsStore } from './store';
import { SettingsTab, AIProviderType, ModelCapability, PromptCategory } from './types';
import AIProviderCard from './components/AIProviderCard';
import LMStudioSection from './components/LMStudioSection';
import AgentEvolverSection from './components/AgentEvolverSection';
import NotificationSettings from './components/NotificationSettings';
import UnitSettings from './components/UnitSettings';
import SystemSettings from './components/SystemSettings';
import DisplaySettings from './components/DisplaySettings';
import DataSettings from './components/DataSettings';
import IntegrationSettings from './components/IntegrationSettings';

const Settings: React.FC = () => {
  const {
    settings,
    isLoading,
    isSaving,
    hasChanges,
    error,
    success,
    activeTab,
    selectedProvider,
    testResult,
    loadSettings,
    saveSettings,
    resetSettings,
    setActiveTab,
    setSelectedProvider,
    clearError,
    clearSuccess,
    exportSettings,
    importSettings,
    hasUnsavedChanges,
  } = useSettingsStore();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (success) {
      toast.success(success);
      clearSuccess();
    }
  }, [success, clearSuccess]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as SettingsTab);
  };

  const handleSave = async () => {
    try {
      await saveSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
      setShowResetDialog(false);
      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      await exportSettings(format);
    } catch (error) {
      console.error('Failed to export settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      await importSettings(importFile);
      setShowImportDialog(false);
      setImportFile(null);
    } catch (error) {
      console.error('Failed to import settings:', error);
      toast.error('Failed to import settings');
    }
  };

  const settingsTabs = [
    {
      value: 'ai-providers',
      label: 'AI Providers',
      icon: <Bot className="w-4 h-4" />,
      description: 'Configure AI models and providers',
    },
    {
      value: 'lm-studio',
      label: 'LM Studio',
      icon: <Monitor className="w-4 h-4" />,
      description: 'Local model management',
    },
    {
      value: 'agent-evolver',
      label: 'Agent Evolver',
      icon: <Brain className="w-4 h-4" />,
      description: 'AI evolution and learning',
    },
    {
      value: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      description: 'Alert and notification settings',
    },
    {
      value: 'units',
      label: 'Units',
      icon: <Gauge className="w-4 h-4" />,
      description: 'Measurement units and display',
    },
    {
      value: 'system',
      label: 'System',
      icon: <Cpu className="w-4 h-4" />,
      description: 'System configuration and preferences',
    },
    {
      value: 'display',
      label: 'Display',
      icon: <DisplayIcon className="w-4 h-4" />,
      description: 'UI appearance and layout',
    },
    {
      value: 'data',
      label: 'Data',
      icon: <Database className="w-4 h-4" />,
      description: 'Data management and backups',
    },
    {
      value: 'integrations',
      label: 'Integrations',
      icon: <Zap className="w-4 h-4" />,
      description: 'Third-party services and APIs',
    },
  ];

  if (isLoading && !settings) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-gray-400">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0D10]">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <SettingsIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-gray-400">Configure your CannaAI Pro experience</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Export Button */}
              <div className="relative group">
                <button
                  onClick={() => handleExport('json')}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Export Settings"
                >
                  <Download className="w-4 h-4 text-gray-300" />
                </button>
                <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg"
                  >
                    Export as CSV
                  </button>
                </div>
              </div>

              {/* Import Button */}
              <button
                onClick={() => setShowImportDialog(true)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Import Settings"
              >
                <Upload className="w-4 h-4 text-gray-300" />
              </button>

              {/* Reset Button */}
              <button
                onClick={() => setShowResetDialog(true)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Reset to Defaults"
              >
                <RotateCcw className="w-4 h-4 text-gray-300" />
              </button>

              {/* Save Button */}
              {hasChanges && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </motion.button>
              )}
            </div>
          </div>

          {/* Status Bar */}
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">You have unsaved changes</span>
            </motion.div>
          )}
        </motion.div>

        {/* Settings Content */}
        <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tab Navigation */}
          <Tabs.List className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 p-1 bg-gray-800/50 rounded-lg">
            {settingsTabs.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="group relative flex flex-col items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white hover:bg-gray-700"
                title={tab.description}
              >
                <span className="data-[state=active]:text-white text-gray-400 group-hover:text-gray-200">
                  {tab.icon}
                </span>
                <span className="hidden xs:block text-xs"> {/* Show text on larger screens */}
                  {tab.label.split(' ')[0]}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* AI Providers Tab */}
              <Tabs.Content value="ai-providers" className="space-y-6">
                <AIProviderCard />
              </Tabs.Content>

              {/* LM Studio Tab */}
              <Tabs.Content value="lm-studio" className="space-y-6">
                <LMStudioSection />
              </Tabs.Content>

              {/* Agent Evolver Tab */}
              <Tabs.Content value="agent-evolver" className="space-y-6">
                <AgentEvolverSection />
              </Tabs.Content>

              {/* Notifications Tab */}
              <Tabs.Content value="notifications" className="space-y-6">
                <NotificationSettings />
              </Tabs.Content>

              {/* Units Tab */}
              <Tabs.Content value="units" className="space-y-6">
                <UnitSettings />
              </Tabs.Content>

              {/* System Tab */}
              <Tabs.Content value="system" className="space-y-6">
                <SystemSettings />
              </Tabs.Content>

              {/* Display Tab */}
              <Tabs.Content value="display" className="space-y-6">
                <DisplaySettings />
              </Tabs.Content>

              {/* Data Tab */}
              <Tabs.Content value="data" className="space-y-6">
                <DataSettings />
              </Tabs.Content>

              {/* Integrations Tab */}
              <Tabs.Content value="integrations" className="space-y-6">
                <IntegrationSettings />
              </Tabs.Content>
            </motion.div>
          </AnimatePresence>
        </Tabs.Root>

        {/* Reset Confirmation Dialog */}
        <Dialog.Root open={showResetDialog} onOpenChange={setShowResetDialog}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6 z-50">
              <Dialog.Title className="text-lg font-semibold text-white mb-4">
                Reset Settings to Defaults?
              </Dialog.Title>
              <Dialog.Description className="text-gray-400 mb-6">
                This will reset all settings to their default values. This action cannot be undone.
              </Dialog.Description>

              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Reset Settings
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Import Dialog */}
        <Dialog.Root open={showImportDialog} onOpenChange={setShowImportDialog}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6 z-50">
              <Dialog.Title className="text-lg font-semibold text-white mb-4">
                Import Settings
              </Dialog.Title>
              <Dialog.Description className="text-gray-400 mb-6">
                Select a settings file to import. This will override your current settings.
              </Dialog.Description>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Settings File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleImport}
                  disabled={!importFile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg transition-colors"
                >
                  Import
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
};

export default Settings;