
import React, { useState } from 'react';
import { TrainingConfig } from '../types';
import { Save, RefreshCw, Info, Leaf, TrendingUp, ShieldCheck, Zap, Gamepad2, Ghost, Network, FolderOpen, Dna, GitBranch, Gauge } from 'lucide-react';

interface ConfigEditorProps {
  config: TrainingConfig;
  onSave: (config: TrainingConfig) => void;
}

// Internal component for consistent tooltips
const LabelWithTooltip: React.FC<{ label: string; tooltip: string; icon?: React.ReactNode }> = ({ label, tooltip, icon }) => (
  <div className="flex items-center gap-2 mb-2">
    <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
        {icon}
        {label}
    </label>
    <div className="group relative">
        <Info size={14} className="text-slate-600 hover:text-violet-400 cursor-help transition-colors" />
        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 bg-slate-900 border border-slate-700 text-slate-300 text-xs p-2.5 rounded-lg shadow-xl z-50 pointer-events-none backdrop-blur-md">
            {tooltip}
            <div className="absolute left-1.5 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-700"></div>
        </div>
    </div>
  </div>
);

const PRESETS: Record<string, Partial<TrainingConfig>> = {
  'default': {
    model_name: 'Qwen2.5-7B-Instruct',
    environment: 'AppWorld',
    learning_rate: 0.0001,
    batch_size: 32,
    mode: 'Full AgentEvolver',
    evolution_strategy: 'genetic',
    population_size: 10,
    generations: 5,
    output_dir: './checkpoints/default'
  },
  'cannabis': {
    model_name: 'BioGrow-LLM-v4',
    environment: 'CannabisGrower-v2',
    learning_rate: 0.00005,
    batch_size: 16,
    mode: 'Full AgentEvolver',
    use_reme: true,
    output_dir: './checkpoints/agritech'
  },
  'finance': {
    model_name: 'FinGPT-Forecaster',
    environment: 'CryptoTrader-Pro',
    learning_rate: 0.0002,
    batch_size: 64,
    mode: 'Basic GRPO',
    use_reme: false,
    output_dir: './checkpoints/finance'
  },
  'security': {
    model_name: 'NetSec-RedTeam-1.0',
    environment: 'CyberSecSim',
    learning_rate: 0.0001,
    batch_size: 32,
    mode: 'Full AgentEvolver',
    use_reme: true,
    output_dir: './checkpoints/netsec'
  },
  'retro-pokemon': {
    model_name: 'GameRL-PyBoy-v1',
    environment: 'PyBoy-PokemonRed',
    learning_rate: 0.0002,
    batch_size: 128,
    mode: 'Full AgentEvolver',
    use_reme: true,
    output_dir: './checkpoints/pokemon'
  },
  'retro-gba': {
    model_name: 'GBA-Agent-Pro',
    environment: 'GBA-Zelda',
    learning_rate: 0.00015,
    batch_size: 64,
    mode: 'Basic GRPO',
    use_reme: true,
    output_dir: './checkpoints/gba'
  }
};

const ConfigEditor: React.FC<ConfigEditorProps> = ({ config: initialConfig, onSave }) => {
  const [config, setConfig] = useState<TrainingConfig>(initialConfig);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (field: keyof TrainingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setConfig(prev => ({ ...prev, ...preset }));
      setIsDirty(true);
    }
  };

  const handleSave = () => {
    onSave(config);
    setIsDirty(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Preset Selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button onClick={() => applyPreset('cannabis')} className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
            <Leaf className="text-emerald-500" size={20} />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-emerald-400 text-center">AgriTech</span>
        </button>
        <button onClick={() => applyPreset('finance')} className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
            <TrendingUp className="text-blue-500" size={20} />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-blue-400 text-center">Finance</span>
        </button>
        <button onClick={() => applyPreset('security')} className="bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
            <ShieldCheck className="text-red-500" size={20} />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-red-400 text-center">Security</span>
        </button>
        <button onClick={() => applyPreset('retro-pokemon')} className="bg-slate-900 border border-slate-800 hover:border-yellow-500/50 hover:bg-yellow-500/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
            <Gamepad2 className="text-yellow-500" size={20} />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-yellow-400 text-center">PyBoy</span>
        </button>
        <button onClick={() => applyPreset('retro-gba')} className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
            <Ghost className="text-purple-500" size={20} />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-purple-400 text-center">GBA</span>
        </button>
         <button onClick={() => applyPreset('default')} className="bg-slate-900 border border-slate-800 hover:border-slate-500/50 hover:bg-slate-500/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group">
            <Zap className="text-slate-500" size={20} />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-slate-400 text-center">Default</span>
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Configuration Editor</h2>
            <p className="text-sm text-slate-400 mt-1">Configure environment dynamics and model connections</p>
          </div>
          <div className="flex gap-3">
              <button
                  onClick={() => setConfig(initialConfig)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                  <RefreshCw size={16} />
                  Reset
              </button>
              <button
                  onClick={handleSave}
                  disabled={!isDirty}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isDirty
                      ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
              >
                  <Save size={16} />
                  Save Changes
              </button>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Environment Settings */}
          <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Environment & Model</h3>

              <div className="space-y-1">
                  <LabelWithTooltip
                    label="Target Environment"
                    tooltip="The specific simulation, game, or API environment the agent will interact with during training. This defines the observation space and reward function."
                  />
                  <select
                      value={config.environment}
                      onChange={(e) => handleChange('environment', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-mono"
                  >
                      <optgroup label="General">
                        <option value="AppWorld">AppWorld (General iOS/Android)</option>
                        <option value="WebShop">WebShop (E-commerce)</option>
                      </optgroup>
                      <optgroup label="Specialized">
                        <option value="CannabisGrower-v2">CannabisGrower-v2 (AgriTech Simulation)</option>
                        <option value="CryptoTrader-Pro">CryptoTrader-Pro (Live Market API)</option>
                        <option value="CyberSecSim">CyberSecSim (Network Penetration)</option>
                      </optgroup>
                      <optgroup label="Retro Gaming (PyBoy)">
                        <option value="PyBoy-PokemonRed">Pokemon Red (GB)</option>
                        <option value="PyBoy-SuperMario">Super Mario Land (GB)</option>
                      </optgroup>
                      <optgroup label="Retro Gaming (GBA)">
                        <option value="GBA-FireEmblem">Fire Emblem (GBA)</option>
                        <option value="GBA-Zelda">Zelda: Minish Cap (GBA)</option>
                      </optgroup>
                      <optgroup label="Science & Robotics">
                        <option value="ProteinFolding-Alpha">ProteinFolding-Alpha (BioTech)</option>
                        <option value="MuJoCo-Ant">MuJoCo-Ant (Physics/Locomotion)</option>
                      </optgroup>
                      <optgroup label="Engineering & Social">
                         <option value="SWE-Bench-Lite">SWE-Bench-Lite (Software Eng)</option>
                         <option value="SocialSim-Village">SocialSim-Village (Multi-Agent)</option>
                         <option value="TrafficControl-AI">TrafficControl-AI (Urban Opt)</option>
                      </optgroup>
                  </select>
              </div>

              <div className="space-y-1">
                  <LabelWithTooltip
                    label="Training Mode"
                    tooltip="Basic GRPO uses PPO-based reinforcement learning. AgentEvolver enables the full suite of self-reflection, memory retrieval (ReMe), and evolutionary prompt updates."
                  />
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                      <button
                          onClick={() => handleChange('mode', 'Basic GRPO')}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                              config.mode === 'Basic GRPO' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                          Basic GRPO
                      </button>
                      <button
                          onClick={() => handleChange('mode', 'Full AgentEvolver')}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                              config.mode === 'Full AgentEvolver' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                          AgentEvolver
                      </button>
                  </div>
              </div>

               <div className="space-y-1">
                    <LabelWithTooltip
                        label="LLM Provider (Training)"
                        tooltip="The backend service used to drive the agent's decision making. Ensure you have the corresponding API key or local server running."
                    />
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-700">
                        {['OpenAI', 'Anthropic', 'LM Studio', 'Ollama', 'vLLM'].map(p => (
                             <button
                                key={p}
                                onClick={() => handleChange('llm_provider', p)}
                                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                                    config.llm_provider === p
                                    ? 'bg-slate-800 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

              <div className="space-y-1">
                  <LabelWithTooltip
                    label="Model Name"
                    tooltip="The specific model identifier to be trained. You can select a popular preset or type a custom path/ID (e.g. for local LoRAs)."
                  />
                  <input
                      list="model-options"
                      type="text"
                      value={config.model_name}
                      onChange={(e) => handleChange('model_name', e.target.value)}
                      placeholder="Select or type model ID..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                  <datalist id="model-options">
                    <option value="Qwen2.5-7B-Instruct" />
                    <option value="Qwen2.5-14B-Instruct" />
                    <option value="Qwen2.5-32B-Instruct" />
                    <option value="Qwen2.5-72B-Instruct" />
                    <option value="Llama-3-8B-Instruct" />
                    <option value="Llama-3-70B-Instruct" />
                    <option value="Mistral-7B-Instruct-v0.3" />
                    <option value="Mixtral-8x7B-Instruct-v0.1" />
                    <option value="Gemma-7B-it" />
                    <option value="DeepSeek-Coder-V2-Lite-Instruct" />
                    <option value="DeepSeek-V2-Chat" />
                    <option value="Phi-3-Medium-4k-Instruct" />
                  </datalist>
              </div>

              {/* Save Location Selector */}
              <div className="space-y-1 pt-2">
                  <LabelWithTooltip
                    label="Server Output Directory"
                    tooltip="The folder path on the server where checkpoints, logs, and final models will be saved."
                    icon={<FolderOpen size={14} className="text-yellow-500" />}
                  />
                  <div className="flex gap-2">
                    <input
                        type="text"
                        value={config.output_dir || './checkpoints'}
                        onChange={(e) => handleChange('output_dir', e.target.value)}
                        placeholder="./checkpoints/my-run-01"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Path relative to the server's root directory.</p>
              </div>

          </div>

          {/* Hyperparameters & Connectivity */}
          <div className="space-y-6">

              {/* AgentEvolver Specific Evolutionary Params */}
              {config.mode === 'Full AgentEvolver' && (
                  <div className="bg-violet-900/10 border border-violet-500/30 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-right-4">
                      <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                          <Dna size={16} /> Evolutionary Hyperparameters
                      </h4>

                      <div className="space-y-1">
                          <LabelWithTooltip
                            label="Evolution Strategy"
                            tooltip="The method used to evolve agent prompts and weights. Genetic algorithms use mutation/crossover. Random search is a baseline."
                          />
                          <select
                              value={config.evolution_strategy || 'genetic'}
                              onChange={(e) => handleChange('evolution_strategy', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                          >
                              <option value="genetic">Genetic Algorithm (GA)</option>
                              <option value="evolutionary_strategy">Evolutionary Strategy (ES)</option>
                              <option value="random_search">Random Search</option>
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <LabelWithTooltip label="Population Size" tooltip="Number of agent variants per generation." icon={<Zap size={12} className="text-yellow-500"/>} />
                              <input
                                  type="number"
                                  value={config.population_size || 10}
                                  onChange={(e) => handleChange('population_size', parseInt(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
                              />
                          </div>
                          <div className="space-y-1">
                              <LabelWithTooltip label="Generations" tooltip="Total evolutionary cycles." icon={<GitBranch size={12} className="text-emerald-500"/>} />
                              <input
                                  type="number"
                                  value={config.generations || 5}
                                  onChange={(e) => handleChange('generations', parseInt(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
                              />
                          </div>
                      </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <LabelWithTooltip label="Mutation Rate" tooltip="Probability of prompt mutation." icon={<Dna size={12} className="text-red-500"/>} />
                              <input
                                  type="number"
                                  step="0.01"
                                  value={config.mutation_rate || 0.1}
                                  onChange={(e) => handleChange('mutation_rate', parseFloat(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
                              />
                          </div>
                          <div className="space-y-1">
                              <LabelWithTooltip label="Crossover Rate" tooltip="Probability of combining traits." icon={<Network size={12} className="text-blue-500"/>} />
                              <input
                                  type="number"
                                  step="0.01"
                                  value={config.crossover_rate || 0.5}
                                  onChange={(e) => handleChange('crossover_rate', parseFloat(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
                              />
                          </div>
                      </div>
                  </div>
              )}

              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Params & Connections</h3>

              <div className="space-y-1">
                  <LabelWithTooltip
                    label="LLM Provider API Key"
                    tooltip="Authentication key for the selected cloud provider (OpenAI, Anthropic). Leave blank for local providers like LM Studio or Ollama."
                  />
                  <input
                      type="password"
                      value={config.api_key}
                      onChange={(e) => handleChange('api_key', e.target.value)}
                      placeholder={config.llm_provider === 'LM Studio' || config.llm_provider === 'vLLM' ? 'Not always needed for local' : 'sk-...'}
                      disabled={config.llm_provider === 'LM Studio' || config.llm_provider === 'Ollama' || config.llm_provider === 'vLLM'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  />
              </div>

               {(config.llm_provider === 'LM Studio' || config.llm_provider === 'Ollama' || config.llm_provider === 'vLLM') && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                      <LabelWithTooltip
                        label="Local Base URL"
                        icon={<Network size={14} className="text-blue-400"/>}
                        tooltip="The API endpoint address for your local inference server. Standard is http://localhost:1234/v1 for LM Studio."
                      />
                      <input
                          type="text"
                          value={config.llm_base_url || ''}
                          onChange={(e) => handleChange('llm_base_url', e.target.value)}
                          placeholder="http://localhost:1234/v1"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono"
                      />
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <LabelWithTooltip
                        label="Learning Rate"
                        tooltip="Controls how much the model weights are updated during training. Smaller values (e.g., 0.0001) are more stable but slower."
                      />
                      <input
                          type="number"
                          step="0.0001"
                          value={config.learning_rate}
                          onChange={(e) => handleChange('learning_rate', parseFloat(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                  </div>
                  <div className="space-y-1">
                      <LabelWithTooltip
                        label="Batch Size"
                        tooltip="The number of training examples used in one iteration. Larger batches require more GPU memory."
                      />
                      <input
                          type="number"
                          value={config.batch_size}
                          onChange={(e) => handleChange('batch_size', parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                  </div>
              </div>

              <div className="space-y-1">
                  <LabelWithTooltip
                    label="Epochs"
                    tooltip="The number of times the learning algorithm will work through the entire training dataset."
                  />
                  <div className="flex items-center gap-4">
                      <input
                          type="range"
                          min="1"
                          max="100"
                          value={config.epochs}
                          onChange={(e) => handleChange('epochs', parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                      <span className="w-12 text-center bg-slate-800 rounded py-1 text-sm font-mono text-white">{config.epochs}</span>
                  </div>
              </div>

              {/* External App Connection Section */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500" />
                    External User App API
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <LabelWithTooltip
                        label="Webhook / Endpoint URL"
                        tooltip="Optional URL where the agent will post telemetry and action logs in real-time. Useful for integrating with your own dashboard."
                      />
                      <input
                          type="text"
                          placeholder="https://your-app.com/api/agent-hook"
                          value={config.external_api_url || ''}
                          onChange={(e) => handleChange('external_api_url', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-violet-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <LabelWithTooltip
                        label="Auth Token (Bearer)"
                        tooltip="The bearer token used to authenticate requests sent to your external webhook."
                      />
                      <input
                          type="password"
                          placeholder="Your App Secret"
                          value={config.external_api_token || ''}
                          onChange={(e) => handleChange('external_api_token', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-violet-500 outline-none"
                      />
                    </div>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigEditor;
