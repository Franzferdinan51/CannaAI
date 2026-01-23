
import React, { useEffect, useState } from 'react';
import { BrainCircuit, Search, Database, Cpu, Activity } from 'lucide-react';

interface AgentMRIProps {
  steps: string[];
  active: boolean;
}

const AgentMRI: React.FC<AgentMRIProps> = ({ steps, active }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (active) {
        const interval = setInterval(() => {
            setCurrentStep(prev => (prev + 1) % 4);
        }, 800);
        return () => clearInterval(interval);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="my-4 mx-8 bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center gap-6 animate-in fade-in slide-in-from-left-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 bg-violet-500/20 rounded-full animate-ping"></div>
            <div className="relative bg-slate-900 rounded-full p-2 border border-violet-500">
                <BrainCircuit className="text-violet-400 animate-pulse" size={24} />
            </div>
        </div>

        <div className="flex-1 space-y-3">
             <div className="flex justify-between items-center text-xs font-mono text-slate-500 uppercase tracking-wider">
                <span>Reasoning Engine Active</span>
                <span className="flex items-center gap-1 text-emerald-500">
                    <Activity size={10} /> {Math.floor(Math.random() * 40 + 60)}ms
                </span>
             </div>

             <div className="flex gap-2">
                 {[
                    { label: 'Context', icon: Database },
                    { label: 'Search', icon: Search },
                    { label: 'Process', icon: Cpu },
                    { label: 'Generate', icon: BrainCircuit }
                 ].map((step, idx) => (
                     <div key={idx} className={`flex-1 h-1 rounded-full transition-all duration-300 ${idx <= currentStep ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-slate-800'}`}></div>
                 ))}
             </div>

             <p className="text-sm text-slate-300 font-mono animate-pulse">
                {currentStep === 0 && "Retrieving context from VectorDB..."}
                {currentStep === 1 && "Grounding with Search Tools..."}
                {currentStep === 2 && "Analyzing intent & safety..."}
                {currentStep === 3 && "Synthesizing final response..."}
             </p>
        </div>
    </div>
  );
};

export default AgentMRI;
