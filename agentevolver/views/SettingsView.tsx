
import React, { useState, useEffect } from 'react';
import { AppSettings, GeminiConfig, IntegrationConfig } from '../types';
import { Save, Server, Monitor, Volume2, Shield, RefreshCw, CheckCircle2, XCircle, Info, Sparkles, MapPin, Search as SearchIcon, Brain, Mic, Webhook, Key, Copy, Network } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

// Internal component for consistent tooltips
const LabelWithTooltip: React.FC<{ label: string; tooltip: string; icon?: React.ReactNode }> = ({ label, tooltip, icon }) => (
  <div className="flex items-center gap-2 mb-2">
    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
        {icon}
        {label}
    </label>
    <div className="group relative">
        <Info size={14} className="text-slate-600 hover:text-violet-400 cursor-help transition-colors" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 border border-slate-700 text-slate-200 text-xs p-2.5 rounded shadow-xl z-50 pointer-events-none backdrop-blur-md">
            {tooltip}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-700"></div>
        </div>
    </div>
  </div>
);

const SettingsView: React.FC<SettingsViewProps> = ({ settings: initialSettings, onSave }) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [systemIp, setSystemIp] = useState("Loading...");

  useEffect(() => {
      // Mock fetching system info
      setSystemIp(window.location.host);

      // Init integration config if missing
      if (!settings.integration) {
          setSettings(prev => ({
              ...prev,
              integration: {
                  serviceKey: crypto.randomUUID().replace(/-/g, ''),
                  webhookUrl: '',
                  webhookSecret: '',
                  enabled: false
              }
          }));
      }
  }, []);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleGeminiChange = (field: keyof GeminiConfig, value: any) => {
      setSettings(prev => ({
          ...prev,
          gemini: { ...prev.gemini, [field]: value }
      }));
  };

  const handleIntegrationChange = (field: keyof IntegrationConfig, value: any) => {
      setSettings(prev => ({
          ...prev,
          integration: { ...(prev.integration || {} as IntegrationConfig), [field]: value }
      }));
  };

  const regenerateKey = () => {
      const newKey = crypto.randomUUID().replace(/-/g, '');
      handleIntegrationChange('serviceKey', newKey);
  };

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${settings.baseUrl}/models`, {
            signal: controller.signal
        });
        clearTimeout(id);

        if (response.ok) {
            const data = await response.json();
            const models = data.data?.map((m: any) => m.id) || [];
            setDetectedModels(models);
            setConnectionStatus('connected');
            if (models.length > 0 && !models.includes(settings.modelId)) {
                handleChange('modelId', models[0]);
            }
        } else {
            setConnectionStatus('error');
        }
    } catch (e) {
        setConnectionStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">

      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            <p className="text-slate-400 text-sm mt-1">Global preferences and connection management.</p>
        </div>
        <button
            onClick={() => onSave(settings)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-violet-500/25 transition-all active:scale-95"
        >
            <Save size={18} />
            Save Configuration
        </button>
      </div>

      {/* Developer API & Integration (NEW SECTION) */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden group">
         <div className="absolute -left-10 -top-10 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all"></div>
         <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2 relative z-10">
            <Webhook className="text-pink-500" size={20} />
            Developer API & Integration
         </h3>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* INCOMING */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <Network size={14} /> Incoming Connections (Ingress)
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    External applications can submit jobs or push telemetry metrics to this dashboard using the API below.
                </p>

                <div className="space-y-1">
                    <LabelWithTooltip label="Base Endpoint" tooltip="The root URL for external apps to connect to." />
                    <code className="block w-full bg-black/40 border border-slate-800 rounded px-3 py-2 text-xs text-emerald-400 font-mono">
                        http://{systemIp}/api/integration
                    </code>
                </div>

                <div className="space-y-1">
                    <LabelWithTooltip label="Service API Key" tooltip="The 'X-Service-Key' header required for external apps to authenticate." />
                    <div className="flex gap-2">
                        <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm flex items-center justify-between">
                             <span>{settings.integration?.serviceKey || 'Generating...'}</span>
                        </div>
                        <button onClick={regenerateKey} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700" title="Regenerate Key">
                            <RefreshCw size={16} className="text-slate-400"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* OUTGOING */}
            <div className="space-y-4 pl-0 md:pl-8 md:border-l border-slate-800">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <Webhook size={14} /> Outgoing Webhooks (Egress)
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    Send events (Training Started, Epoch Complete) to your external application logic.
                </p>

                <div className="space-y-1">
                     <LabelWithTooltip label="Webhook URL" tooltip="The external URL where we will POST JSON event data." />
                     <input
                        type="text"
                        value={settings.integration?.webhookUrl || ''}
                        onChange={(e) => handleIntegrationChange('webhookUrl', e.target.value)}
                        placeholder="https://your-app.com/api/callbacks/agent-evolver"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-pink-500 outline-none text-sm font-mono"
                    />
                </div>

                 <div className="space-y-1">
                     <LabelWithTooltip label="Signing Secret" tooltip="Sent as 'X-Agent-Signature' header for verification." />
                     <input
                        type="password"
                        value={settings.integration?.webhookSecret || ''}
                        onChange={(e) => handleIntegrationChange('webhookSecret', e.target.value)}
                        placeholder="Secret Key"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-pink-500 outline-none text-sm font-mono"
                    />
                </div>
            </div>
         </div>
      </section>

      {/* Gemini Specific Settings */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Sparkles size={120} />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <Sparkles className="text-blue-400" size={20} />
            Google Gemini Advanced Features
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                 <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                        <LabelWithTooltip
                            label="Search Grounding"
                            icon={<SearchIcon size={14} className="text-blue-400"/>}
                            tooltip="Uses Google Search to provide up-to-date information. Adds citations to responses."
                        />
                    </div>
                    <button
                        onClick={() => handleGeminiChange('useSearchGrounding', !settings.gemini?.useSearchGrounding)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.gemini?.useSearchGrounding ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.gemini?.useSearchGrounding ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                </div>

                 <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                        <LabelWithTooltip
                            label="Maps Grounding"
                            icon={<MapPin size={14} className="text-emerald-400"/>}
                            tooltip="Uses Google Maps to find real-world locations and places."
                        />
                    </div>
                    <button
                        onClick={() => handleGeminiChange('useMapsGrounding', !settings.gemini?.useMapsGrounding)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.gemini?.useMapsGrounding ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.gemini?.useMapsGrounding ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                </div>

                 <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                        <LabelWithTooltip
                            label="Thinking Mode"
                            icon={<Brain size={14} className="text-violet-400"/>}
                            tooltip="Enables extensive reasoning for complex queries using Gemini 3 Pro. Slower but smarter."
                        />
                    </div>
                    <button
                        onClick={() => handleGeminiChange('useThinkingMode', !settings.gemini?.useThinkingMode)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.gemini?.useThinkingMode ? 'bg-violet-600' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.gemini?.useThinkingMode ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <LabelWithTooltip
                        label="Thinking Budget (Tokens)"
                        tooltip="Max tokens allocated for hidden chain-of-thought reasoning."
                    />
                    <div className="flex gap-4 items-center">
                        <input
                            type="range"
                            min="1024"
                            max="32768"
                            step="1024"
                            disabled={!settings.gemini?.useThinkingMode}
                            value={settings.gemini?.thinkingBudget || 1024}
                            onChange={(e) => handleGeminiChange('thinkingBudget', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50"
                        />
                        <span className="font-mono text-xs text-slate-300 w-12">{settings.gemini?.thinkingBudget}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <LabelWithTooltip
                        label="TTS Voice"
                        icon={<Mic size={14} className="text-orange-400"/>}
                        tooltip="Voice persona for Text-to-Speech generation."
                    />
                    <select
                        value={settings.gemini?.voiceName || 'Kore'}
                        onChange={(e) => handleGeminiChange('voiceName', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                    >
                        <option value="Puck">Puck</option>
                        <option value="Charon">Charon</option>
                        <option value="Kore">Kore</option>
                        <option value="Fenrir">Fenrir</option>
                        <option value="Zephyr">Zephyr</option>
                    </select>
                </div>
            </div>
        </div>
      </section>

      {/* LM Studio / Local LLM Section */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <Server className="text-emerald-500" size={20} />
            Primary Chat Provider
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="space-y-1">
                    <LabelWithTooltip
                        label="Provider"
                        tooltip="The interface service used for the Chat tab. This allows you to chat with models running locally or in the cloud."
                    />
                    <div className="grid grid-cols-2 gap-2">
                        {['OpenAI', 'Anthropic', 'LM Studio', 'Ollama', 'vLLM', 'Google Gemini'].map(provider => (
                            <button
                                key={provider}
                                onClick={() => handleChange('provider', provider)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                                    settings.provider === provider
                                    ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                {provider}
                            </button>
                        ))}
                    </div>
                </div>
                {/* ... existing fields ... */}
                <div className="space-y-1">
                    <LabelWithTooltip
                        label="Base URL"
                        tooltip="The API endpoint for your LLM. For LM Studio, use http://localhost:1234/v1. For Ollama, use http://localhost:11434/v1."
                    />
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={settings.baseUrl}
                            onChange={(e) => handleChange('baseUrl', e.target.value)}
                            placeholder="http://localhost:1234/v1"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                        />
                        <button
                            onClick={checkConnection}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 rounded-lg border border-slate-700 transition-colors"
                            title="Test Connection"
                        >
                            <RefreshCw size={16} className={connectionStatus === 'checking' ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    {connectionStatus === 'connected' && (
                        <p className="text-xs text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Connected successfully
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                 <div className="space-y-1">
                    <LabelWithTooltip
                        label="Model ID"
                        tooltip="The exact name of the model currently loaded in your provider. Use 'Test Connection' to auto-detect available models."
                    />
                    <input
                        type="text"
                        value={settings.modelId}
                        onChange={(e) => handleChange('modelId', e.target.value)}
                        placeholder="e.g., qwen2.5-7b-instruct"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                    />
                </div>
            </div>
        </div>
      </section>

      {/* Interface Settings */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <Monitor className="text-blue-500" size={20} />
            Interface & Experience
        </h3>

        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex flex-col">
                    <LabelWithTooltip
                        label="Stream Responses"
                        tooltip="If enabled, Chat messages will appear character-by-character (typewriter effect). Disable to show full message at once."
                    />
                    <span className="text-xs text-slate-500 pl-6">Typewriter effect for LLM output</span>
                </div>
                <button
                    onClick={() => handleChange('streamResponse', !settings.streamResponse)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.streamResponse ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.streamResponse ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
