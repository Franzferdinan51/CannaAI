
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Cpu, Activity, ArrowRight, Eye, ThumbsUp, ThumbsDown, X, WifiOff, Maximize2, Minimize2, Settings, Save, Server, Key, BrainCircuit, Play, Square, FileText, Info } from 'lucide-react';
import { View, TrainingConfig, SystemStatus, AgentResponse, ContextSnapshot, AgentAction, AgentSettings, AgentToolType } from '../types';

// --- Default Agent Configuration ---
const DEFAULT_AGENT_SETTINGS: AgentSettings = {
    provider: 'LM Studio',
    apiKey: '',
    model: 'local-model',
    baseUrl: 'http://localhost:1234/v1',
    temperature: 0.1, // Low temp for control
    maxTokens: 1024,
    systemPrompt: `You are the Autonomous Control Unit (ACU) for the AgentEvolver Dashboard.
You have FULL CONTROL over the application state.
Your goal is to assist the user in configuring, training, and monitoring AI agents.

AVAILABLE TOOLS:
1. navigate(view: string) - Change the current screen. Options: 'dashboard', 'config', 'autotrain', 'logs', 'memory', 'chat', 'settings'.
2. updateConfig(updates: object) - Modify the Training Configuration. Example: {"learning_rate": 0.0002, "environment": "WebShop"}
3. startTraining() - Launch the training process.
4. stopTraining() - Terminate the training process.
5. analyzeLogs() - Request the last 50 lines of logs to debug issues.

RESPONSE FORMAT:
You MUST respond with valid JSON in the following format:
{
  "thought_process": ["Step 1: Analyze request", "Step 2: Check state", "Step 3: Decide action"],
  "response_text": "I will update the learning rate and start training.",
  "action": {
    "tool": "updateConfig",
    "parameters": { "learning_rate": 0.005 },
    "reasoning": "User requested aggressive learning rate."
  }
}
If no action is needed, set "action" to null.
`
};

interface AgentOmnibarProps {
  // Read Access (The Eyes)
  currentView: View;
  activeConfig: TrainingConfig;
  systemStatus: SystemStatus;

  // Write Access (The Hands)
  onNavigate: (view: View) => void;
  onUpdateConfig: (config: Partial<TrainingConfig>) => void;
  onStartTraining: () => void;
  onStopTraining: () => void;
}

// Internal Helper for Tooltips
const LabelWithTooltip: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <div className="flex items-center gap-2 mb-1">
    <label className="text-xs font-semibold text-slate-400 uppercase">{label}</label>
    <div className="group relative">
        <Info size={12} className="text-slate-600 hover:text-violet-400 cursor-help transition-colors" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] p-2 rounded shadow-xl z-50 pointer-events-none backdrop-blur-md">
            {tooltip}
        </div>
    </div>
  </div>
);

const AgentOmnibar: React.FC<AgentOmnibarProps> = ({
    currentView, activeConfig, systemStatus,
    onNavigate, onUpdateConfig, onStartTraining, onStopTraining
}) => {
    // UI State
    const [isOpen, setIsOpen] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Core Agent State
    const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);
    const [thoughtLog, setThoughtLog] = useState<string[]>([]);

    const thoughtsEndRef = useRef<HTMLDivElement>(null);

    // Load settings from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('agent_god_mode_settings');
        if (saved) {
            try { setAgentSettings(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    // Save settings when changed
    const saveSettings = (newSettings: AgentSettings) => {
        setAgentSettings(newSettings);
        localStorage.setItem('agent_god_mode_settings', JSON.stringify(newSettings));
        setShowSettings(false);
        setThoughtLog(prev => [...prev, `[SYSTEM] Agent Brain reconfigured: ${newSettings.provider}`]);
    };

    useEffect(() => {
        if (thoughtsEndRef.current) {
            thoughtsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [thoughtLog, isExpanded]);

    // --- The Hands: Client-Side Tool Executor ---
    const executeAction = async (action: AgentAction) => {
        if (!action) return;

        const { tool, parameters } = action;
        setThoughtLog(prev => [...prev, `[EXECUTOR] Calling tool: ${tool}...`]);

        await new Promise(r => setTimeout(r, 600)); // Cinematic delay

        try {
            switch (tool) {
                case 'navigate':
                    onNavigate(parameters.route || parameters.view as View);
                    setThoughtLog(prev => [...prev, `[EXECUTOR] Navigated to ${parameters.route || parameters.view}`]);
                    break;
                case 'startTraining':
                     onStartTraining();
                     setThoughtLog(prev => [...prev, `[EXECUTOR] Training signal sent.`]);
                     break;
                case 'stopTraining':
                     onStopTraining();
                     setThoughtLog(prev => [...prev, `[EXECUTOR] Stop signal sent.`]);
                     break;
                case 'updateConfig':
                     onUpdateConfig(parameters.updates || parameters);
                     setThoughtLog(prev => [...prev, `[EXECUTOR] Configuration updated.`]);
                     break;
                case 'analyzeLogs':
                     setThoughtLog(prev => [...prev, `[EXECUTOR] Scanning last 50 log lines... (Simulated)`]);
                     break;
                case 'terminal':
                     setThoughtLog(prev => [...prev, `[EXECUTOR] Shell command: ${parameters.command}`]);
                     break;
                default:
                    setThoughtLog(prev => [...prev, `[EXECUTOR] Tool ${tool} not implemented client-side.`]);
            }
        } catch (e) {
            setThoughtLog(prev => [...prev, `[ERROR] Execution failed: ${e}`]);
        }
    };

    // --- The Brain: LLM Service Integration ---
    const queryAgentBrain = async (query: string, snapshot: ContextSnapshot): Promise<AgentResponse> => {
        const { provider, apiKey, baseUrl, model, systemPrompt } = agentSettings;

        const contextStr = JSON.stringify({
            user_query: query,
            current_state: {
                view: snapshot.currentView,
                status: snapshot.systemStatus,
                config_summary: {
                    env: snapshot.activeConfig.environment,
                    model: snapshot.activeConfig.model_name,
                    mode: snapshot.activeConfig.mode
                }
            }
        }, null, 2);

        // 1. Construct Payload based on Provider
        let endpoint = '';
        let headers: any = { 'Content-Type': 'application/json' };
        let body: any = {};

        if (provider === 'Google Gemini') {
            // Gemini API
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
            body = {
                contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nINPUT CONTEXT:\n" + contextStr }] }],
                generationConfig: { response_mime_type: "application/json" }
            };
        } else if (provider === 'OpenRouter') {
            endpoint = 'https://openrouter.ai/api/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            // headers['HTTP-Referer'] = window.location.href; // Optional for OpenRouter
            body = {
                model: model || 'google/gemini-flash-1.5',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: contextStr }
                ],
                response_format: { type: "json_object" }
            };
        } else {
            // Local (LM Studio / Ollama)
            endpoint = `${baseUrl}/chat/completions`;
            body = {
                model: model || 'local-model',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: contextStr }
                ],
                temperature: agentSettings.temperature
            };
        }

        // 2. Execute Request
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Provider Error (${res.status}): ${errText}`);
            }

            const data = await res.json();
            let contentString = "";

            // 3. Parse Response
            if (provider === 'Google Gemini') {
                contentString = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            } else {
                contentString = data.choices?.[0]?.message?.content || "{}";
            }

            // Cleanup potential markdown code blocks
            contentString = contentString.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(contentString) as AgentResponse;

        } catch (error: any) {
            console.error("Agent Brain Error:", error);
            throw error;
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        setIsThinking(true);
        setLastResponse(null);
        setThoughtLog(["Capture State Snapshot...", "Encoding User Query...", `Contacting ${agentSettings.provider}...`]);

        const snapshot: ContextSnapshot = {
            currentView,
            activeConfig,
            systemStatus
        };

        try {
            // Use Direct Client-Side Brain
            const data = await queryAgentBrain(input, snapshot);

            // Visualize Thoughts
            for (const thought of data.thought_process || []) {
                setThoughtLog(prev => [...prev, `[CORTEX] ${thought}`]);
                await new Promise(r => setTimeout(r, 200));
            }

            setLastResponse(data);

            if (data.action) {
                await executeAction(data.action);
            }

        } catch (error: any) {
            setThoughtLog(prev => [...prev, `[FAILURE] ${error.message || 'Unknown error'}`]);
            setThoughtLog(prev => [...prev, `[FALLBACK] Switching to Simulation Mode for demo purposes...`]);

            // --- OFFLINE SIMULATION FALLBACK (Keep existing fallback for robustness) ---
            await new Promise(r => setTimeout(r, 800));
            const lowerInput = input.toLowerCase();
            let mockAction: AgentAction | undefined = undefined;
            let mockResponseText = "I couldn't reach the external brain, but I'm running locally.";

            if (lowerInput.includes('navigate') || lowerInput.includes('go to')) {
                let target: View | undefined;
                if (lowerInput.includes('dashboard')) target = 'dashboard';
                else if (lowerInput.includes('config')) target = 'config';
                else if (lowerInput.includes('train')) target = 'autotrain';
                else if (lowerInput.includes('log')) target = 'logs';
                else if (lowerInput.includes('chat')) target = 'chat';

                if (target) {
                    mockAction = { tool: 'navigate', parameters: { route: target }, reasoning: "Offline fallback navigation" };
                    mockResponseText = `Navigating to ${target}.`;
                }
            } else if (lowerInput.includes('start')) {
                mockAction = { tool: 'startTraining', parameters: {}, reasoning: "Offline fallback start" };
                mockResponseText = "Starting training.";
            } else if (lowerInput.includes('stop')) {
                mockAction = { tool: 'stopTraining', parameters: {}, reasoning: "Offline fallback stop" };
                mockResponseText = "Stopping training.";
            }

            setLastResponse({
                thought_process: ["Provider connection failed", "Using local heuristics"],
                response_text: mockResponseText,
                action: mockAction
            });
            if (mockAction) await executeAction(mockAction);

        } finally {
            setIsThinking(false);
            setInput('');
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-500 rounded-full shadow-2xl flex items-center justify-center text-white transition-all z-50 border-2 border-white/20 animate-in fade-in zoom-in"
            >
                <Cpu size={24} />
            </button>
        );
    }

    return (
        <div className={`fixed z-50 transition-all duration-500 ease-in-out flex flex-col bg-slate-950/95 backdrop-blur-xl border border-violet-500/30 shadow-2xl overflow-hidden ${
            isExpanded
            ? 'top-10 bottom-10 left-10 right-10 rounded-2xl'
            : 'bottom-6 right-6 w-[450px] rounded-2xl h-[500px]'
        }`}>
            {/* Header */}
            <div className="h-14 bg-slate-900 border-b border-violet-900/30 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-violet-900/50 flex items-center justify-center border border-violet-500/30">
                        <Activity size={18} className="text-violet-400 animate-pulse" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-200 tracking-wider block">AGENT_CORE</span>
                        <span className="text-[10px] text-slate-500 font-mono block">PROVIDER: {agentSettings.provider.toUpperCase()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded hover:bg-slate-800 transition-colors ${showSettings ? 'text-violet-400 bg-violet-900/20' : 'text-slate-400'}`}
                        title="Agent Brain Settings"
                    >
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title={isExpanded ? "Minimize" : "Expand Window"}
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 rounded hover:bg-red-900/20 text-slate-500 hover:text-red-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Settings Overlay */}
                {showSettings && (
                    <div className="absolute inset-0 bg-slate-950/95 z-20 p-6 overflow-y-auto animate-in fade-in slide-in-from-top-4">
                        <div className="max-w-xl mx-auto space-y-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                                <BrainCircuit className="text-violet-400" />
                                Agent Brain Configuration
                            </h3>

                            {/* Core Intelligence Section */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Cpu size={14} className="text-blue-400" /> Core Intelligence
                                </h4>

                                <div className="space-y-1">
                                    <LabelWithTooltip
                                        label="Intelligence Provider"
                                        tooltip="The backend LLM service used to drive the omnibar's reasoning capabilities."
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Google Gemini', 'OpenRouter', 'LM Studio', 'Ollama'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setAgentSettings(prev => ({ ...prev, provider: p as any }))}
                                                className={`py-2 px-3 text-xs font-bold rounded border transition-all ${
                                                    agentSettings.provider === p
                                                    ? 'bg-violet-600 border-violet-500 text-white'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <LabelWithTooltip
                                        label="API Key"
                                        tooltip="Your authentication key for the selected provider. Stored locally in browser."
                                    />
                                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded px-3 py-2">
                                        <Key size={14} className="text-slate-500" />
                                        <input
                                            type="password"
                                            value={agentSettings.apiKey}
                                            onChange={(e) => setAgentSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                                            placeholder={agentSettings.provider === 'LM Studio' ? 'Not needed for local' : 'sk-...'}
                                            className="flex-1 bg-transparent border-none outline-none text-sm text-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Operational Parameters Section */}
                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Settings size={14} className="text-emerald-400" /> Operational Parameters
                                </h4>

                                <div className="space-y-1">
                                    <LabelWithTooltip
                                        label="Model ID"
                                        tooltip="The specific model identifier (e.g., 'gemini-1.5-pro', 'gpt-4'). Must match the provider's registry."
                                    />
                                    <input
                                        type="text"
                                        value={agentSettings.model}
                                        onChange={(e) => setAgentSettings(prev => ({ ...prev, model: e.target.value }))}
                                        placeholder="gemini-1.5-pro-latest"
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono"
                                    />
                                </div>

                                {(agentSettings.provider === 'LM Studio' || agentSettings.provider === 'Ollama') && (
                                     <div className="space-y-1">
                                        <LabelWithTooltip
                                            label="Local Base URL"
                                            tooltip="The endpoint address for local inference servers."
                                        />
                                        <input
                                            type="text"
                                            value={agentSettings.baseUrl}
                                            onChange={(e) => setAgentSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <LabelWithTooltip
                                        label="System Prompt"
                                        tooltip="The meta-instructions defining the agent's persona and available tools."
                                    />
                                    <textarea
                                        value={agentSettings.systemPrompt}
                                        onChange={(e) => setAgentSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                        className="w-full h-32 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 font-mono resize-none custom-scroll"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => saveSettings(agentSettings)}
                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors"
                                >
                                    <Save size={14} />
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Log & Chat Output */}
                <div className="flex-1 flex flex-col bg-black/20">
                     <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 custom-scroll scroll-smooth">
                        <div className="text-slate-600 text-center py-4 select-none">
                            <Cpu size={32} className="mx-auto mb-2 opacity-20" />
                            <p>God Mode Active. I have full read/write access.</p>
                        </div>

                        {thoughtLog.map((log, i) => (
                            <div key={i} className={`flex gap-3 py-1 border-b border-white/5 ${log.includes('[ERROR]') || log.includes('[FAILURE]') ? 'text-red-400 bg-red-950/10' : log.includes('[EXECUTOR]') ? 'text-emerald-400 bg-emerald-950/10' : log.includes('[SIMULATION]') ? 'text-yellow-400' : 'text-violet-300'}`}>
                                <span className="opacity-40 min-w-[60px] text-[10px] pt-0.5">{new Date().toLocaleTimeString().split(' ')[0]}</span>
                                <span className="break-words leading-relaxed">{log}</span>
                            </div>
                        ))}

                        {lastResponse && (
                            <div className="mt-6 mx-2 p-4 bg-slate-900/80 border border-slate-700 rounded-lg animate-in fade-in slide-in-from-bottom-2 shadow-xl">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-violet-600 rounded-lg">
                                        <Terminal size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{lastResponse.response_text}</p>

                                        {lastResponse.action && (
                                            <div className="mt-3 bg-black/40 rounded p-2 text-xs font-mono border-l-2 border-emerald-500">
                                                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                                    <Play size={10} />
                                                    <span className="uppercase font-bold">Executing Action</span>
                                                </div>
                                                <span className="text-slate-400">Tool: </span>
                                                <span className="text-slate-200">{lastResponse.action.tool}</span>
                                                <br/>
                                                <span className="text-slate-400">Reasoning: </span>
                                                <span className="text-slate-300 italic">"{lastResponse.action.reasoning}"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={thoughtsEndRef} />
                     </div>

                     {/* Input Area */}
                     <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
                        <div className="flex-1 relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Command the agent (e.g., 'Update learning rate to 0.005 and start training')..."
                                className="w-full bg-slate-950 border border-slate-700 group-hover:border-slate-600 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white focus:ring-2 focus:ring-violet-500/50 outline-none font-mono transition-all shadow-inner"
                            />
                            <div className="absolute right-3 top-3.5">
                                <Eye size={18} className={`transition-colors ${isThinking ? 'text-violet-400 animate-pulse' : 'text-slate-700'}`} />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isThinking || !input}
                            className="bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AgentOmnibar;
