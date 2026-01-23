
import React from 'react';
import { LayoutDashboard, FileJson, Terminal, BrainCircuit, Activity, MessageSquareCode, Settings, Wand2, Image, ChevronRight, LogOut } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Mission Control', icon: <LayoutDashboard size={18} /> },
    { id: 'autotrain', label: 'AutoTrain Pipeline', icon: <Wand2 size={18} /> },
    { id: 'config', label: 'Configuration', icon: <FileJson size={18} /> },
    { id: 'chat', label: 'Agent Chat & Tools', icon: <MessageSquareCode size={18} /> },
    { id: 'media', label: 'Generative Media', icon: <Image size={18} /> },
    { id: 'logs', label: 'Live Telemetry', icon: <Terminal size={18} /> },
    { id: 'memory', label: 'Neural Memory', icon: <BrainCircuit size={18} /> },
    { id: 'settings', label: 'System Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="w-64 h-screen bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl z-20 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"></div>

      {/* Header */}
      <div className="p-6 pb-2 flex items-center gap-3 relative z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
           <Activity size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">AgentEvolver</h1>
          <p className="text-[10px] text-violet-400 font-mono mt-1 font-medium tracking-wide">ENTERPRISE EDITION</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 relative z-10 overflow-y-auto custom-scroll">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-2">Platform</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`group w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent ${
              currentView === item.id
                ? 'bg-violet-500/10 text-violet-300 border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
                {item.icon}
                {item.label}
            </div>
            {currentView === item.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer / Status */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 relative z-10">
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <span className="font-bold text-xs text-slate-400">OP</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold text-slate-300 truncate">Operator Admin</div>
                    <div className="text-[10px] text-slate-500 truncate">admin@agent-evolver.ai</div>
                </div>
                <button className="text-slate-500 hover:text-slate-300"><LogOut size={14} /></button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Env Connection</span>
                    <span className="flex items-center gap-1.5 text-emerald-500 font-mono">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Stable
                    </span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
