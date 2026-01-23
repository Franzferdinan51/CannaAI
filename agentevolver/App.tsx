
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LogConsole from './components/LogConsole';
import ConfigEditor from './components/ConfigEditor';
import MetricsChart from './components/MetricsChart';
import MemoryInspector from './views/MemoryInspector';
import ChatInterface from './views/ChatInterface';
import SettingsView from './views/SettingsView';
import AutoTrainView from './views/AutoTrainView';
import MediaGallery from './views/MediaGallery';
import AgentOmnibar from './components/AgentOmnibar';
import CommandPalette from './components/CommandPalette';
import ToastSystem from './components/ToastSystem';
import { View, TrainingConfig, LogMessage, MetricPoint, ExperienceItem, SystemStatus, AppSettings, Toast } from './types';
import { Play, Square, Wifi, WifiOff, AlertTriangle, Trophy, Target, Zap, Clock, ArrowUp, Cpu, HardDrive, Layout, Activity, Server, Wand2, Settings, Terminal, DownloadCloud } from 'lucide-react';
import { generateMockLog, generateMockMetrics, MOCK_EXPERIENCE } from './services/mockService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>(MOCK_EXPERIENCE);

  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bestAgentAvailable, setBestAgentAvailable] = useState(false);

  const [status, setStatus] = useState<SystemStatus>({
    training_active: false,
    env_service: 'online',
    reme_service: 'online',
    backend_connection: false,
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
      provider: 'LM Studio',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      modelId: '',
      contextWindow: 4096,
      temperature: 0.7,
      theme: 'default',
      soundEffects: true,
      streamResponse: true,
      autoScroll: true,
      logRetention: 1000,
      analyticsEnabled: false
  });

  const [config, setConfig] = useState<TrainingConfig>( {
    model_name: 'Qwen2.5-7B-Instruct',
    environment: 'AppWorld',
    api_key: '',
    llm_provider: 'OpenAI',
    learning_rate: 0.0001,
    batch_size: 32,
    epochs: 10,
    mode: 'Full AgentEvolver',
    use_reme: true,
    evolution_strategy: 'genetic',
    population_size: 10,
    generations: 5,
    mutation_rate: 0.1,
    crossover_rate: 0.5,
    external_api_url: '',
    external_api_token: '',
    output_dir: './checkpoints/default'
  });

  const [useSimulation, setUseSimulation] = useState(false);
  const [isLogPaused, setIsLogPaused] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Initial Config Load & Health Check
  useEffect(() => {
      const initSystem = async () => {
          try {
              // 1. Fetch Config
              const res = await fetch('/api/config');
              if (res.ok) {
                  const savedConfig = await res.json();
                  setConfig(savedConfig);
                  setStatus(prev => ({ ...prev, backend_connection: true }));
              } else {
                  throw new Error("API not reachable");
              }

              // 2. Connect WebSocket
              const socket = new WebSocket(`ws://${window.location.host}/ws/logs`);
              socket.onopen = () => console.log("WebSocket connected");
              socket.onmessage = (event) => {
                  const log = JSON.parse(event.data);

                  // Handle Metrics (Structured JSON from EvolutionService)
                  if (log.message.includes('[METRIC]')) {
                      try {
                          // Extract JSON part: [METRIC] {"step":...}
                          const jsonStr = log.message.replace('[METRIC]', '').trim();

                          // Check if it's the old format or new JSON format
                          if (jsonStr.startsWith('{')) {
                              const metricData = JSON.parse(jsonStr);
                              setMetrics(prev => [...prev.slice(-49), {
                                  step: metricData.step,
                                  reward: metricData.reward,
                                  success_rate: metricData.success_rate,
                                  loss: metricData.loss
                              }]);

                              // Don't clutter logs with raw metric JSON
                              return;
                          } else {
                             // Fallback for mockService format "step=10 ..."
                             const parts = log.message.split(' ');
                             const step = parseInt(parts[1]?.split('=')[1] || '0');
                             const reward = parseFloat(parts[2]?.split('=')[1] || '0');
                             const success = parseFloat(parts[3]?.split('=')[1] || '0');
                             if (step > 0) {
                                 setMetrics(prev => [...prev.slice(-49), { step, reward, success_rate: success, loss: 0 }]);
                             }
                          }
                      } catch (e) {
                          console.error("Failed to parse metric", e);
                      }
                  }

                  // Handle Completion
                  if (log.message.includes('Evolution process completed successfully')) {
                      setStatus(prev => ({ ...prev, training_active: false }));
                      setBestAgentAvailable(true);
                      addToast('Evolution Complete', 'Best agent is ready to load.', 'success');
                  }

                  // Standard Logging
                  setLogs(prev => [...prev.slice(-99), log]);
              };
              socket.onerror = () => {
                  console.log("WebSocket error");
                  setStatus(prev => ({ ...prev, backend_connection: false }));
                  setUseSimulation(true);
              };
              setWs(socket);

          } catch (e) {
              console.log("Backend offline, switching to simulation.");
              setStatus(prev => ({ ...prev, backend_connection: false }));
              setUseSimulation(true);
          }
      };

      initSystem();
      return () => {
          if (ws) ws.close();
      };
  }, []);

  const addToast = (title: string, description?: string, type: 'success'|'info'|'warning'|'error' = 'info') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, title, description, type }]);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleLoadBestAgent = async () => {
      try {
          const res = await fetch('/api/checkpoint/best');
          if (res.ok) {
              const data = await res.json();
              addToast('Agent Loaded', `Loaded ID: ${data.id} (Reward: ${data.metrics.reward})`, 'success');
              // Switch to chat and notify user (in a real app, this would update the chat context)
              setCurrentView('chat');
              setBestAgentAvailable(false);
          }
      } catch(e) {
          addToast('Load Failed', 'Could not retrieve checkpoint', 'error');
      }
  };

  // Simulation Loop (Fallback)
  useEffect(() => {
    let interval: any;
    if (status.training_active && useSimulation) {
      let step = metrics.length > 0 ? metrics[metrics.length - 1].step : 0;

      interval = setInterval(() => {
        step += 1;
        const newMetric = generateMockMetrics(step);
        setMetrics(prev => [...prev.slice(-49), newMetric]);
        const newLog = generateMockLog(step);
        setLogs(prev => [...prev.slice(-99), newLog]);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status.training_active, useSimulation, metrics]);

  // Command Palette Listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLaunch = async (overrideEnv?: string) => {
    setStatus(prev => ({ ...prev, training_active: true }));
    setMetrics([]); // Reset metrics for new run
    setBestAgentAvailable(false);
    addToast('Training Started', `Pipeline launched for ${config.model_name}`, 'success');

    if (status.backend_connection && !useSimulation) {
        try {
            await fetch('/api/start', { method: 'POST' });
        } catch (e) {
            addToast('Error', 'Failed to start backend process', 'error');
        }
    }
  };

  const handleStop = async () => {
    setStatus(prev => ({ ...prev, training_active: false }));
    addToast('Training Stopped', 'Process interrupted by user.', 'warning');

    if (status.backend_connection && !useSimulation) {
        await fetch('/api/stop', { method: 'POST' });
    }
  };

  const handleClearLogs = () => {
      setLogs([]);
      addToast('Logs Cleared', '', 'info');
  };

  const handleUpdateConfig = async (updates: Partial<TrainingConfig>) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);

      if (status.backend_connection) {
          try {
              await fetch('/api/config', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(newConfig)
              });
              addToast('Configuration Saved', 'Persisted to Database', 'success');
          } catch (e) {
              addToast('Save Failed', 'Could not sync with backend', 'error');
          }
      } else {
          addToast('Configuration Updated', 'Local only (Simulation Mode)', 'success');
      }
  };

  const handleRewardSignal = (val: number) => {
      if (val === 0) return;
      setLogs(prev => [...prev, {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString(),
          level: 'HUMAN_FEEDBACK',
          message: `Reward Overridden: ${val > 0 ? '+' : ''}${val}`
      }]);
      addToast('Reward Signal Sent', `Manually adjusted environment reward by ${val}`, val > 0 ? 'success' : 'error');

      if (status.backend_connection) {
           fetch('/agent/feedback', {
               method: 'POST',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ prompt: "manual_override", action: "N/A", rating: val })
           });
      }
  };

  const handleLaunchAutoTrain = async (autoConfig: any) => {
      setStatus(prev => ({ ...prev, training_active: true }));
      addToast('AutoTrain Job Started', `Task: ${autoConfig.taskType}`, 'success');
      setCurrentView('logs');

      if (status.backend_connection && !useSimulation) {
          try {
              await fetch('/api/autotrain/start', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(autoConfig)
              });
          } catch (e) {
              addToast('Error', 'Failed to start AutoTrain', 'error');
          }
      } else {
          // Add initial log for simulation
          setLogs(prev => [...prev, {
              id: crypto.randomUUID(),
              timestamp: new Date().toLocaleTimeString(),
              level: 'INFO',
              message: `[AutoTrain] Starting pipeline for ${autoConfig.baseModel}...`
          }]);
      }
  };

  const handleCommandAction = (action: string) => {
      switch(action) {
          case 'start_training': handleLaunch(); break;
          case 'stop_training': handleStop(); break;
          case 'clear_logs': handleClearLogs(); break;
      }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">

        {/* Modern Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm flex items-center justify-between px-6 z-10 shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white tracking-wide capitalize flex items-center gap-2">
                   {currentView === 'dashboard' && <Layout size={18} className="text-violet-500" />}
                   {currentView === 'autotrain' && <Wand2 size={18} className="text-violet-500" />}
                   {currentView === 'config' && <Settings size={18} className="text-violet-500" />}
                   {currentView === 'chat' && <Activity size={18} className="text-violet-500" />}
                   {currentView === 'logs' && <AlertTriangle size={18} className="text-violet-500" />}
                   {currentView === 'dashboard' ? 'Mission Control' : currentView.replace('-', ' ')}
                </h2>
                <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                    <span className="font-mono">⌘K</span>
                    <span>to search</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
               {bestAgentAvailable && (
                    <button
                        onClick={handleLoadBestAgent}
                        className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse"
                    >
                        <DownloadCloud size={14} />
                        Load Best Agent
                    </button>
               )}

               <button
                 onClick={() => setUseSimulation(!useSimulation)}
                 className="text-xs text-slate-500 hover:text-slate-300 underline decoration-dashed"
               >
                 {useSimulation ? 'Simulation Mode' : 'Live Connection'}
               </button>

               <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                   status.backend_connection && !useSimulation ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-red-500/5 border-red-500/20 text-red-500'
               }`}>
                  {status.backend_connection && !useSimulation ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {status.backend_connection && !useSimulation ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
               </div>

               <div className="h-6 w-px bg-slate-800 mx-2"></div>

               {!status.training_active ? (
                   <button
                     onClick={() => handleLaunch()}
                     className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-lg shadow-violet-500/25 transition-all active:scale-95 border border-white/10"
                   >
                     <Play size={14} fill="currentColor" />
                     Start Run
                   </button>
               ) : (
                   <button
                     onClick={handleStop}
                     className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95"
                   >
                     <Square size={14} fill="currentColor" />
                     Stop Run
                   </button>
               )}
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative custom-scroll">

          {currentView === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Top Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {/* Card 1: Reward */}
                 <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-violet-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={48} className="text-violet-500" />
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Peak Reward</p>
                    <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-mono text-white font-bold">
                             {metrics.length > 0 ? Math.max(...metrics.map(m => m.reward)).toFixed(4) : '0.0000'}
                         </span>
                         <span className="text-xs text-emerald-500 flex items-center font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                             <ArrowUp size={10} className="mr-0.5"/>
                             +12%
                         </span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 mt-3 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 w-3/4 rounded-full"></div>
                    </div>
                 </div>

                 {/* Card 2: Success Rate */}
                 <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={48} className="text-emerald-500" />
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Success Rate</p>
                    <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-mono text-white font-bold">
                            {metrics.length > 0 ? (metrics[metrics.length - 1].success_rate * 100).toFixed(1) : '0.0'}%
                         </span>
                         <span className="text-xs text-slate-500 font-mono">
                            / 100%
                         </span>
                    </div>
                     <div className="w-full h-1 bg-slate-800 mt-3 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[65%] rounded-full"></div>
                    </div>
                 </div>

                 {/* Card 3: Total Steps */}
                 <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={48} className="text-blue-500" />
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Global Step</p>
                    <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-mono text-white font-bold">
                            {metrics.length > 0 ? metrics[metrics.length - 1].step.toLocaleString() : 0}
                         </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 font-mono">
                        ~145 steps / sec
                    </p>
                 </div>

                 {/* Card 4: Est Time */}
                 <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={48} className="text-amber-500" />
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Est. Remaining</p>
                    <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-mono text-white font-bold">
                            04:12:30
                         </span>
                    </div>
                     <p className="text-[10px] text-amber-500/80 mt-3 font-mono">
                        Epoch 3 / {config.epochs}
                    </p>
                 </div>
              </div>

              {/* Main Viz & Logs */}
              <div className="grid grid-cols-12 gap-6 h-[450px]">
                  <div className="col-span-12 lg:col-span-8 h-full">
                      <MetricsChart data={metrics} />
                  </div>
                  <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-4">
                       <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center backdrop-blur-sm">
                             <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Live Stream</span>
                             </div>
                             <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                             </div>
                          </div>
                          <div className="flex-1 overflow-hidden relative">
                              {/* Overlay gradient for fade effect at top */}
                              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-900/50 to-transparent z-10 pointer-events-none"></div>
                              <LogConsole logs={logs} isPaused={isLogPaused} onTogglePause={() => setIsLogPaused(!isLogPaused)} onClear={handleClearLogs} onRewardSignal={handleRewardSignal} />
                          </div>
                       </div>
                  </div>
              </div>

              {/* System & Config Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Active Config Panel */}
                 <div className="col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <Server size={16} className="text-violet-400" />
                            Active Configuration
                        </h3>
                        <div className="grid grid-cols-4 gap-4 text-xs">
                            <div className="space-y-1">
                                <span className="text-slate-500 font-medium block">Model Architecture</span>
                                <span className="text-slate-300 font-mono bg-black/20 px-2 py-1 rounded border border-slate-800 block truncate" title={config.model_name}>
                                    {config.model_name}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-slate-500 font-medium block">Environment</span>
                                <span className="text-emerald-400 font-mono bg-emerald-950/10 px-2 py-1 rounded border border-emerald-900/30 block truncate">
                                    {config.environment}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-slate-500 font-medium block">Strategy</span>
                                <span className="text-violet-400 font-mono bg-violet-950/10 px-2 py-1 rounded border border-violet-900/30 block truncate">
                                    {config.mode === 'Full AgentEvolver' ? 'Evolution (GA)' : 'PPO/GRPO'}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-slate-500 font-medium block">Learning Rate</span>
                                <span className="text-slate-300 font-mono bg-black/20 px-2 py-1 rounded border border-slate-800 block">
                                    {config.learning_rate}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-800/50 flex gap-2">
                         <button onClick={() => setCurrentView('config')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded font-medium transition-colors">
                            Modify Config
                         </button>
                         <button onClick={() => setCurrentView('autotrain')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded font-medium transition-colors">
                            View Pipeline
                         </button>
                    </div>
                 </div>

                 {/* System Resources (Mock) */}
                 <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <Cpu size={16} className="text-blue-400" />
                        System Resources
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">GPU VRAM (A100)</span>
                                <span className="text-slate-300 font-mono">22.4 / 40 GB</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="w-[56%] h-full bg-blue-500 rounded-full"></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">System RAM</span>
                                <span className="text-slate-300 font-mono">16.2 / 64 GB</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="w-[25%] h-full bg-violet-500 rounded-full"></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Storage (SSD)</span>
                                <span className="text-slate-300 font-mono">450 / 1024 GB</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="w-[44%] h-full bg-emerald-500 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {currentView === 'config' && (
             <ConfigEditor config={config} onSave={handleUpdateConfig} />
          )}

          {currentView === 'autotrain' && (
              <AutoTrainView
                onLaunchAutoTrain={handleLaunchAutoTrain}
                appSettings={appSettings}
              />
          )}

           {currentView === 'chat' && (
             <ChatInterface
                config={config}
                appSettings={appSettings}
                onLaunchTraining={handleLaunch}
                onUpdateConfig={handleUpdateConfig}
             />
          )}

          {currentView === 'media' && (
             <MediaGallery />
          )}

          {currentView === 'settings' && (
             <SettingsView
                settings={appSettings}
                onSave={(s) => { setAppSettings(s); addToast('Settings Saved', '', 'success'); }}
             />
          )}

          {currentView === 'logs' && (
             <div className="h-full">
                <LogConsole logs={logs} isPaused={isLogPaused} onTogglePause={() => setIsLogPaused(!isLogPaused)} onClear={handleClearLogs} onRewardSignal={handleRewardSignal} />
             </div>
          )}

          {currentView === 'memory' && (
             <MemoryInspector items={experience} />
          )}

        </div>
      </main>

      <AgentOmnibar
          currentView={currentView}
          activeConfig={config}
          systemStatus={status}
          onNavigate={setCurrentView}
          onUpdateConfig={handleUpdateConfig}
          onStartTraining={() => handleLaunch()}
          onStopTraining={handleStop}
      />

      <CommandPalette
          isOpen={isCmdOpen}
          onClose={() => setIsCmdOpen(false)}
          onNavigate={(view) => { setCurrentView(view); }}
          onAction={handleCommandAction}
      />

      <ToastSystem toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default App;
