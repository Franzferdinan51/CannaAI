
import React, { useState, useMemo } from 'react';
import { ExperienceItem } from '../types';
import { Brain, CheckCircle2, XCircle, Search, Filter, Info, ChevronRight, Award, Clock, Tag, Database, ArrowRight, Zap, Globe, Sparkles, AlertTriangle, Layers, ArrowDown } from 'lucide-react';

interface MemoryInspectorProps {
  items: ExperienceItem[];
}

// Tooltip Helper
const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group/tooltip relative inline-block ml-1 align-middle">
    <Info size={12} className="text-slate-500 hover:text-violet-400 cursor-help transition-colors" />
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-64 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] p-2.5 rounded-lg shadow-xl z-50 pointer-events-none backdrop-blur-md leading-relaxed text-center">
      {text}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-700"></div>
    </div>
  </div>
);

const TrajectoryStep: React.FC<{ step: string; index: number; isLast: boolean }> = ({ step, index, isLast }) => (
    <div className="flex items-center">
        <div className={`relative group flex flex-col items-center min-w-[100px] max-w-[140px] p-2 rounded-lg border transition-all ${
            isLast
            ? 'bg-violet-900/10 border-violet-500/30'
            : 'bg-slate-950 border-slate-700 hover:border-slate-500'
        }`}>
            <span className="absolute -top-2 left-2 px-1.5 bg-slate-900 text-[9px] font-mono text-slate-500 border border-slate-800 rounded">
                STEP {index + 1}
            </span>
            <span className="text-xs font-mono text-slate-300 text-center break-words w-full mt-1">
                {step.trim()}
            </span>
        </div>
        {!isLast && (
            <div className="px-2 text-slate-600">
                <ArrowRight size={14} />
            </div>
        )}
    </div>
);

const MemoryInspector: React.FC<MemoryInspectorProps> = ({ items }) => {
  const [search, setSearch] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<'All' | 'Success' | 'Failure'>('All');
  const [filterEnv, setFilterEnv] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derive Environments
  const environments = useMemo(() => Array.from(new Set(items.map(i => i.environment).filter(Boolean))), [items]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.task.toLowerCase().includes(search.toLowerCase()) ||
                            item.reflection.toLowerCase().includes(search.toLowerCase());
      const matchesOutcome = filterOutcome === 'All' || item.outcome === filterOutcome;
      const matchesEnv = filterEnv === 'All' || item.environment === filterEnv;
      return matchesSearch && matchesOutcome && matchesEnv;
    });
  }, [items, search, filterOutcome, filterEnv]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const success = items.filter(i => i.outcome === 'Success').length;
    const rate = total > 0 ? (success / total) * 100 : 0;
    const avgReward = total > 0 ? items.reduce((acc, curr) => acc + (curr.reward || 0), 0) / total : 0;
    return { total, success, rate, avgReward };
  }, [items]);

  const toggleExpand = (id: string) => {
      setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">

      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Brain className="text-violet-500" />
                ReMe Memory
            </h2>
            <p className="text-xs text-slate-400 mt-1">
                Reflexion Memory stores episodes where the agent self-corrected or succeeded, used to improve future prompts.
            </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
             <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                 <Database size={24} />
             </div>
             <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center">
                    Total Trajectories
                    <Tooltip text="The total number of episode traces stored in the episodic memory buffer." />
                 </p>
                 <p className="text-2xl font-mono text-white">{stats.total}</p>
             </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
             <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                 <Zap size={24} />
             </div>
             <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    Success Rate
                    <Tooltip text="The ratio of successfully completed tasks to total attempts. Higher reliability indicates better policy convergence." />
                 </p>
                 <p className="text-2xl font-mono text-white">{stats.rate.toFixed(1)}%</p>
             </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
             <div className="p-3 bg-violet-500/10 rounded-lg text-violet-500">
                 <Award size={24} />
             </div>
             <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                     Avg Reward
                     <Tooltip text="The mean Reinforcement Learning (RL) reward signal received per episode (scale 0.0 - 1.0). " />
                 </p>
                 <p className="text-2xl font-mono text-white">{stats.avgReward.toFixed(2)}</p>
             </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks or reflections..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
        </div>

        <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
            <Filter size={16} className="text-slate-500" />
            <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
                <option value="All">All Outcomes</option>
                <option value="Success">Success Only</option>
                <option value="Failure">Failure Only</option>
            </select>

            <select
                value={filterEnv}
                onChange={(e) => setFilterEnv(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500"
            >
                <option value="All">All Environments</option>
                {environments.map(e => <option key={e} value={e as string}>{e}</option>)}
            </select>
        </div>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scroll">
        {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Brain size={48} className="mb-4 opacity-20" />
                <p>No memories found matching your filters.</p>
            </div>
        ) : (
            filteredItems.map((item) => {
                const trajectorySteps = item.trajectory.split('->').filter(Boolean);
                const isExpanded = expandedId === item.id;

                return (
                <div key={item.id} className={`bg-slate-900/80 border rounded-xl p-5 transition-all group shadow-sm ${
                    isExpanded ? 'border-violet-500/50 bg-slate-900 shadow-md' : 'border-slate-800 hover:border-violet-500/30'
                }`}>
                    {/* Card Header (Always Visible) */}
                    <div className="cursor-pointer" onClick={() => toggleExpand(item.id)}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-4">
                                <div className={`mt-1 p-2 h-fit rounded-lg ${item.outcome === 'Success' ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-red-500/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]'}`}>
                                    {item.outcome === 'Success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-200 group-hover:text-violet-300 transition-colors">{item.task}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                        <span className="text-xs font-mono text-slate-500 bg-black/30 px-2 py-0.5 rounded border border-slate-800">ID: {item.id}</span>
                                        {item.environment && (
                                            <span className="text-xs text-blue-400 flex items-center gap-1 bg-blue-900/10 px-2 py-0.5 rounded border border-blue-800/30">
                                                <Globe size={10} /> {item.environment}
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock size={10} /> {item.timestamp}
                                        </span>
                                        {item.reward !== undefined && (
                                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex items-center ${item.reward > 0 ? 'text-emerald-400 bg-emerald-900/10' : 'text-red-400 bg-red-900/10'}`}>
                                                R: {item.reward}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {item.tags && (
                                    <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-[200px]">
                                        {item.tags.map(tag => (
                                            <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full flex items-center gap-1 border border-slate-700">
                                                <Tag size={8} /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="text-slate-500">
                                    {isExpanded ? <Layers size={18} className="text-violet-400" /> : <ArrowDown size={18} />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expandable Content */}
                    <div className={`mt-4 space-y-5 overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 max-h-[800px]' : 'opacity-0 max-h-0 hidden'}`}>

                        {/* Visual Trajectory */}
                        <div className="bg-black/20 p-4 rounded-xl border border-slate-800/50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                     <Layers size={14} className="text-blue-400"/>
                                     Sequential Trajectory
                                     <Tooltip text="The step-by-step actions executed by the agent to attempt the task." />
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">{trajectorySteps.length} Steps Executed</span>
                            </div>

                            <div className="flex items-start overflow-x-auto pb-4 scrollbar-hide pt-2 px-1">
                                {trajectorySteps.map((step, idx) => (
                                    <TrajectoryStep
                                        key={idx}
                                        step={step}
                                        index={idx}
                                        isLast={idx === trajectorySteps.length - 1}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Contextualized Reflection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             {/* Strategic Value */}
                             <div className={`p-4 rounded-xl border ${item.outcome === 'Success' ? 'bg-emerald-900/5 border-emerald-500/20' : 'bg-red-900/5 border-red-500/20'}`}>
                                 <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${item.outcome === 'Success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                     {item.outcome === 'Success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                     {item.outcome === 'Success' ? 'Reinforcement Value' : 'Correction Needed'}
                                 </h4>
                                 <p className="text-xs text-slate-300 leading-relaxed">
                                     {item.outcome === 'Success'
                                        ? "This trajectory provides a positive example of successful task completion. The memory will reinforce this pattern in future episodes."
                                        : "This failure indicates a gap in the agent's reasoning or tool usage. The reflection below serves as a negative constraint for future attempts."}
                                 </p>
                             </div>

                             {/* The Reflection Itself */}
                             <div className="md:col-span-2 relative">
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-l"></div>
                                 <div className="h-full bg-slate-950/50 rounded-r-xl p-4 pl-5 border border-slate-800 border-l-0">
                                     <span className="text-violet-400 text-xs font-bold uppercase tracking-wider block mb-2 flex items-center gap-2">
                                        <Sparkles size={12} />
                                        {item.outcome === 'Success' ? 'Extracted Wisdom (Policy Update)' : 'Critique & Adjustment'}
                                        <Tooltip text="The synthesized lesson learned from this episode, used to optimize the agent's system prompt." />
                                     </span>
                                     <p className="text-sm text-slate-200 italic leading-relaxed font-serif">
                                         "{item.reflection}"
                                     </p>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Preview Trajectory (When collapsed) */}
                    {!isExpanded && (
                         <div className="mt-3 flex items-center gap-2 overflow-hidden opacity-50">
                            {trajectorySteps.slice(0, 5).map((step, idx) => (
                                <div key={idx} className="flex items-center">
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded whitespace-nowrap">
                                        {step.trim().length > 20 ? step.substring(0, 18) + '..' : step.trim()}
                                    </span>
                                    {idx < Math.min(trajectorySteps.length, 5) - 1 && <ChevronRight size={10} className="text-slate-700" />}
                                </div>
                            ))}
                            {trajectorySteps.length > 5 && <span className="text-[10px] text-slate-600">+{trajectorySteps.length - 5} more</span>}
                        </div>
                    )}
                </div>
            )})
        )}
      </div>
    </div>
  );
};

export default MemoryInspector;
