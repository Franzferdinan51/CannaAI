import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Settings as SettingsIcon,
  Bot,
  Cpu,
  Monitor,
  Bell,
  Loader2,
  Save,
  Download,
  Upload,
  RotateCcw,
  Database,
  Zap,
  Gauge,
  AlertCircle,
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  X,
} from 'lucide-react';

import { useSettingsStore } from './store';
import { SettingsTab } from './types';
import AIProviderCard from './components/AIProviderCard';
import LMStudioSection from './components/LMStudioSection';
import ProviderStatusPanel from './components/ProviderStatusPanel';
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
    loadSettings,
    saveSettings,
    resetSettings,
    setActiveTab,
    clearError,
    clearSuccess,
    exportSettings,
    importSettings,
  } = useSettingsStore();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (error) {
      toast.error(error, { id: 'settings-error' });
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (success) {
      toast.success(success, { id: 'settings-success' });
      clearSuccess();
    }
  }, [success, clearSuccess]);

  // Close export menu on outside tap / Escape (touch-friendly)
  useEffect(() => {
    if (!showExportMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExportMenu(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showExportMenu]);

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
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setShowExportMenu(false);
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
      short: 'AI',
      icon: Bot,
      description: 'Configure AI models and providers',
    },
    {
      value: 'lm-studio',
      label: 'LM Studio',
      short: 'LM',
      icon: Monitor,
      description: 'Local model management',
    },
    {
      value: 'notifications',
      label: 'Notifications',
      short: 'Alerts',
      icon: Bell,
      description: 'Alert and notification settings',
    },
    {
      value: 'units',
      label: 'Units',
      short: 'Units',
      icon: Gauge,
      description: 'Measurement units and display',
    },
    {
      value: 'system',
      label: 'System',
      short: 'System',
      icon: Cpu,
      description: 'System configuration and preferences',
    },
    {
      value: 'display',
      label: 'Display',
      short: 'Display',
      icon: Monitor,
      description: 'UI appearance and layout',
    },
    {
      value: 'data',
      label: 'Data',
      short: 'Data',
      icon: Database,
      description: 'Data management and backups',
    },
    {
      value: 'integrations',
      label: 'Integrations',
      short: 'APIs',
      icon: Zap,
      description: 'Third-party services and APIs',
    },
  ];

  if (isLoading && !settings) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
              <div className="absolute inset-0 blur-xl bg-emerald-400/30 rounded-full" />
            </div>
            <p className="text-white/40 text-sm">Loading settings…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="mx-auto max-w-6xl">
        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-deep rounded-3xl p-5 sm:p-7 mb-5 relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 right-10 w-72 h-72 rounded-full blur-[100px] opacity-25 bg-emerald-500" />
          </div>
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-[52px] h-[52px] p-3 rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-lime-400 shadow-[0_0_32px_-6px_rgba(52,211,153,0.8)]">
                  <SettingsIcon className="w-6 h-6 text-emerald-950" strokeWidth={2.4} />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-[28px] font-extrabold tracking-tight">
                  <span className="gradient-text">Settings</span>
                </h1>
                <p className="text-white/45 text-sm mt-0.5">Tune your CannaAI Pro experience</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Export — click-driven, touch friendly */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu(v => !v)}
                  aria-label="Export settings"
                  aria-haspopup="menu"
                  aria-expanded={showExportMenu}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] hover:border-emerald-400/25 transition-all"
                  title="Export Settings"
                >
                  <Download className="w-4 h-4 text-white/70" />
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      className="glass-deep absolute top-full right-0 mt-2 w-52 rounded-2xl p-1.5 z-50"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleExport('json')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-white/75 hover:bg-white/[0.06] hover:text-white rounded-xl transition-colors"
                      >
                        <FileJson className="w-4 h-4 text-emerald-300" />
                        Export as JSON
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-white/75 hover:bg-white/[0.06] hover:text-white rounded-xl transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-lime-300" />
                        Export as CSV
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => setShowImportDialog(true)}
                aria-label="Import settings"
                className="p-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] hover:border-emerald-400/25 transition-all"
                title="Import Settings"
              >
                <Upload className="w-4 h-4 text-white/70" />
              </button>

              <button
                type="button"
                onClick={() => setShowResetDialog(true)}
                aria-label="Reset settings to defaults"
                className="p-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-red-400/10 hover:border-red-400/30 transition-all"
                title="Reset to Defaults"
              >
                <RotateCcw className="w-4 h-4 text-white/70" />
              </button>

              {hasChanges && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary-glow px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.4} />}
                  Save Changes
                </motion.button>
              )}
            </div>
          </div>

          {/* Unsaved changes banner */}
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative overflow-hidden"
              >
                <div className="mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25">
                  <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-sm text-amber-200/90 font-medium">You have unsaved changes — they'll be lost if you leave</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Settings Content */}
        <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
          {/* Tab Navigation — horizontal scroll pills, mobile-first */}
          <div className="sticky top-0 z-20 -mx-1 px-1 pb-3 pt-1 bg-gradient-to-b from-[#05080a] via-[#05080a]/95 to-transparent">
            <Tabs.List
              aria-label="Settings sections"
              className="glass flex items-center gap-1.5 rounded-2xl p-1.5 overflow-x-auto scrollbar-hide"
            >
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.value;
                return (
                  <Tabs.Trigger
                    key={tab.value}
                    value={tab.value}
                    title={tab.description}
                    className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300 shrink-0 ${
                      active ? 'text-white' : 'text-white/45 hover:text-white/85 hover:bg-white/[0.05]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="settings-tab-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/25 to-lime-400/10 border border-emerald-400/30 shadow-[0_0_20px_-6px_rgba(52,211,153,0.7)]"
                        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                      />
                    )}
                    <Icon className={`relative z-10 w-4 h-4 ${active ? 'text-emerald-300' : ''}`} strokeWidth={active ? 2.4 : 2} />
                    <span className="relative z-10 hidden min-[420px]:inline">{tab.label}</span>
                    <span className="relative z-10 min-[420px]:hidden">{tab.short}</span>
                  </Tabs.Trigger>
                );
              })}
            </Tabs.List>
          </div>

          {/* Tab Content */}
          <div className="pb-24 lg:pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <Tabs.Content value="ai-providers" className="space-y-4 focus:outline-none">
                  <ProviderStatusPanel />
                  <AIProviderCard />
                </Tabs.Content>

                <Tabs.Content value="lm-studio" className="space-y-4 focus:outline-none">
                  <LMStudioSection />
                </Tabs.Content>

                <Tabs.Content value="notifications" className="space-y-4 focus:outline-none">
                  <NotificationSettings />
                </Tabs.Content>

                <Tabs.Content value="units" className="space-y-4 focus:outline-none">
                  <UnitSettings />
                </Tabs.Content>

                <Tabs.Content value="system" className="space-y-4 focus:outline-none">
                  <SystemSettings />
                </Tabs.Content>

                <Tabs.Content value="display" className="space-y-4 focus:outline-none">
                  <DisplaySettings />
                </Tabs.Content>

                <Tabs.Content value="data" className="space-y-4 focus:outline-none">
                  <DataSettings />
                </Tabs.Content>

                <Tabs.Content value="integrations" className="space-y-4 focus:outline-none">
                  <IntegrationSettings />
                </Tabs.Content>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs.Root>

        {/* Sticky mobile save bar */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="lg:hidden fixed bottom-[76px] inset-x-4 z-40"
            >
              <div className="glass-deep rounded-2xl p-3 flex items-center gap-3 glow-leaf">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 ml-1" />
                <p className="flex-1 text-[13px] font-medium text-white/70">Unsaved changes</p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary-glow px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.4} />}
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Dialog */}
        <Dialog.Root open={showResetDialog} onOpenChange={setShowResetDialog}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
            <Dialog.Content className="glass-deep fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 sm:p-7">
              <Dialog.Title className="font-display text-lg font-bold text-white mb-2">
                Reset settings to defaults?
              </Dialog.Title>
              <Dialog.Description className="text-white/50 text-sm mb-6 leading-relaxed">
                This will reset all settings to their default values. This action cannot be undone.
              </Dialog.Description>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                <Dialog.Close asChild>
                  <button type="button" className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] text-white/80 text-sm font-semibold transition-all">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-sm font-semibold shadow-[0_10px_30px_-10px_rgba(248,113,113,0.7)] hover:brightness-110 transition-all"
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
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
            <Dialog.Content className="glass-deep fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 sm:p-7">
              <div className="flex items-start justify-between mb-2">
                <Dialog.Title className="font-display text-lg font-bold text-white">
                  Import settings
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" aria-label="Close" className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/50">
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="text-white/50 text-sm mb-6 leading-relaxed">
                Select a settings file to import. This will override your current settings.
              </Dialog.Description>

              <div className="mb-6">
                <label className="block text-[13px] font-semibold text-white/60 mb-2">
                  Settings file
                </label>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                  importFile
                    ? 'border-emerald-400/40 bg-emerald-400/[0.06]'
                    : 'border-white/12 bg-white/[0.02] hover:bg-emerald-400/[0.04] hover:border-emerald-400/30'
                }`}>
                  <div className="flex flex-col items-center justify-center px-4 text-center">
                    {importFile ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-emerald-300 mb-2" />
                        <p className="text-sm text-white/80 font-medium truncate max-w-[240px]">{importFile.name}</p>
                        <p className="text-[11px] text-white/35 mt-1">Tap to choose a different file</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-white/30 mb-2" />
                        <p className="text-sm text-white/45">Tap to choose a <span className="text-emerald-300 font-semibold">.json</span> file</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      setImportFile(e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                <Dialog.Close asChild>
                  <button type="button" className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] text-white/80 text-sm font-semibold transition-all">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!importFile}
                  className="btn-primary-glow px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:pointer-events-none"
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
