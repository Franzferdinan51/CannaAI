import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
  Monitor,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  Eye,
  Brain,
  Sprout,
  HardDrive,
  Clock,
  User,
  Zap,
  Search,
  Filter,
  Download,
  ExternalLink,
  Settings as SettingsIcon,
  Info,
  Activity,
} from 'lucide-react';

import { useSettingsStore } from '../store';
import { LMStudioModel, ModelCapability } from '../types';

const LMStudioSection: React.FC = () => {
  const {
    settings,
    isLoadingLMStudio,
    isSaving,
    lmStudioData,
    loadLMStudioModels,
    saveLMStudioUrl,
  } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCapability, setFilterCapability] = useState<ModelCapability | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified'>('name');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftApiKey, setDraftApiKey] = useState('');
  const [saveWarning, setSaveWarning] = useState('');

  useEffect(() => {
    setDraftUrl(settings?.lmStudio?.url || 'http://127.0.0.1:1234');
    setDraftApiKey(settings?.lmStudio?.apiKey || '');
  }, [settings?.lmStudio?.url]);

  useEffect(() => {
    const configuredUrl = settings?.lmStudio?.url?.trim();
    if (configuredUrl) {
      void loadLMStudioModels(configuredUrl, settings?.lmStudio?.apiKey);
    }
  }, [loadLMStudioModels, settings?.lmStudio?.url, settings?.lmStudio?.apiKey]);

  const handleUrlChange = (url: string) => {
    setDraftUrl(url);
  };

  const handleTestConnection = async () => {
    const url = draftUrl.trim();
    if (!url) return;
    setSaveWarning('');
    // Probe the entered endpoint first. Persisting settings is secondary and
    // must not turn a healthy local LM Studio connection into a false error.
    const connected = await loadLMStudioModels(url, draftApiKey);
    if (connected) {
      const saved = await saveLMStudioUrl(url, { suppressError: true, apiKey: draftApiKey });
      if (!saved) {
        setSaveWarning('Connected to LM Studio, but CannaAI could not save this URL. Use Save Changes to retry.');
      }
    }
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
        return <Activity className="w-3 h-3" />;
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
        return 'bg-white/[0.06] text-white/50 border-white/15';
    }
  };

  const uniqueModels = (lmStudioData?.models || []).filter((model, index, models) => (
    models.findIndex((candidate) => candidate.id === model.id) === index
  ));

  const filteredModels = uniqueModels.filter((model) => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.filename.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCapability = filterCapability === 'all' ||
                              model.capabilities.includes(filterCapability as ModelCapability);

    return matchesSearch && matchesCapability;
  }) || [];

  const sortedModels = [...filteredModels].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'size':
        return b.sizeGB - a.sizeGB;
      case 'modified':
        return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      default:
        return 0;
    }
  });

  const capabilities: Array<{ value: ModelCapability | 'all'; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: 'All Models', icon: <Monitor className="w-4 h-4" /> },
    { value: 'vision', label: 'Vision Models', icon: <Eye className="w-4 h-4" /> },
    { value: 'plant-analysis', label: 'Plant Analysis', icon: <Sprout className="w-4 h-4" /> },
    { value: 'text-generation', label: 'Text Generation', icon: <Brain className="w-4 h-4" /> },
    { value: 'code-generation', label: 'Code Generation', icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* LM Studio Status */}
      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <Monitor className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">LM Studio</h2>
              <p className="text-white/40 text-sm">Manage local AI models and configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lmStudioData?.lmStudioRunning ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Not Connected</span>
              </div>
            )}
            <button
              type="button"
              aria-label="Refresh LM Studio models"
              onClick={() => void loadLMStudioModels(draftUrl.trim() || undefined, draftApiKey)}
              disabled={isLoadingLMStudio}
              className="p-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] transition-all"
            >
              {isLoadingLMStudio ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-white/60 mb-2">
              LM Studio URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={draftUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="http://localhost:1234"
                className="input-glow flex-1 px-4 py-3 bg-white/[0.04] border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-300/50 transition-colors"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                // Manual probes must remain available while the initial
                // background discovery request is waiting on a local service.
                disabled={isSaving || !draftUrl.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-sky-500 to-blue-600 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.7)] hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSaving || isLoadingLMStudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Test Connection
              </button>
            </div>
            {saveWarning && (
              <p role="status" className="mt-2 text-sm text-amber-300">{saveWarning}</p>
            )}
            <label className="block text-[13px] font-semibold text-white/60 mb-2 mt-4">
              LM Studio API key <span className="font-normal text-white/35">(only required when authentication is enabled)</span>
            </label>
            <input
              type="password"
              value={draftApiKey}
              onChange={(e) => setDraftApiKey(e.target.value)}
              placeholder="Optional LM Studio API key"
              aria-label="LM Studio API key"
              className="input-glow w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-300/50 transition-colors"
            />
          </div>

          {!lmStudioData?.lmStudioRunning && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-1">LM Studio Not Running</h4>
                  <p className="text-sm text-white/55">
                    Start LM Studio and load some models to use local AI inference.
                  </p>
                  <a
                    href="https://lmstudio.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Download LM Studio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Models Summary */}
      {lmStudioData && (
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Model Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {lmStudioData.summary.total}
              </div>
              <div className="text-sm text-white/45">Total Models</div>
            </div>
            <div className="text-center p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {lmStudioData.summary.vision}
              </div>
              <div className="text-sm text-white/45">Vision Models</div>
            </div>
            <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="text-2xl font-bold text-emerald-400">
                {lmStudioData.summary.plantAnalysis}
              </div>
              <div className="text-sm text-white/45">Plant Analysis</div>
            </div>
            <div className="text-center p-4 bg-white/[0.04] border border-white/10 rounded-2xl">
              <div className="font-display text-2xl font-extrabold text-white">
                {lmStudioData.summary.textOnly}
              </div>
              <div className="text-sm text-white/45">Text Only</div>
            </div>
          </div>
        </div>
      )}

      {/* Models List */}
      {lmStudioData?.models && lmStudioData.models.length > 0 && (
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              Available Models ({sortedModels.length})
            </h3>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="input-glow w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-300/50 transition-colors"
              />
            </div>

            {/* Capability Filter */}
            <div className="flex gap-2">
              {capabilities.map((capability) => (
                <button
                  key={capability.value}
                  type="button"
                  onClick={() => setFilterCapability(capability.value)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    filterCapability === capability.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  {capability.icon}
                  <span className="hidden sm:inline">{capability.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-white/45">
              Showing {sortedModels.length} of {uniqueModels.length} models
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-glow px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-300/50 transition-colors"
            >
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="modified">Sort by Modified</option>
            </select>
          </div>

          {/* Models Grid */}
          <ScrollArea.Root className="h-[600px] rounded-lg">
            <ScrollArea.Viewport className="h-full w-full">
            <div className="space-y-4 pr-4">
              {sortedModels.map((model) => {
                const quantizationLabel = typeof model.quantization === 'string'
                  ? model.quantization
                  : (model.quantization as any)?.name || 'Unknown';
                return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-4 hover:!border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white mb-1 truncate">{model.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-white/45">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{model.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          <span>{model.sizeFormatted}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{(model.contextLength / 1000).toFixed(1)}k context</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-white/[0.06] text-white/55 text-[11px] rounded-lg border border-white/10">
                        {quantizationLabel}
                      </span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.capabilities.map((capability) => (
                      <span
                        key={capability}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${getCapabilityColor(capability)}`}
                      >
                        {getCapabilityIcon(capability)}
                        {capability.replace('-', ' ')}
                      </span>
                    ))}
                  </div>

                  {/* File Info */}
                  <div className="text-[11px] text-white/35">
                    <div>{model.filename}</div>
                    <div>Modified: {new Date(model.modified).toLocaleDateString()}</div>
                  </div>
                </motion.div>
                );
              })}

              {sortedModels.length === 0 && (
                <div className="text-center py-12">
                  <Monitor className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-bold text-white/70 mb-2">No Models Found</h3>
                  <p className="text-white/35 text-sm">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="glass rounded-3xl p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Setup Instructions
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <h4 className="font-medium text-white">Download LM Studio</h4>
              <p className="text-sm text-white/45">
                Get LM Studio from{' '}
                <a
                  href="https://lmstudio.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  lmstudio.ai
                </a>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <h4 className="font-medium text-white">Download Models</h4>
              <p className="text-sm text-white/45">
                Browse and download AI models from the LM Studio model library. Look for models with vision capabilities for plant analysis.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <h4 className="font-medium text-white">Load a Model</h4>
              <p className="text-sm text-white/45">
                Select a model and load it in LM Studio. The default server URL is http://localhost:1234.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              4
            </div>
            <div>
              <h4 className="font-medium text-white">Configure in CannaAI</h4>
              <p className="text-sm text-white/45">
                Enter your LM Studio URL above and select a model to use for plant analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LMStudioSection;
