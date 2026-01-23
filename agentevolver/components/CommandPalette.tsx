
import React, { useState, useEffect, useRef } from 'react';
import { View } from '../types';
import { Search, LayoutDashboard, Terminal, Brain, Settings, FileJson, Play, Square, Eraser, Command, Image } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onAction: (action: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, onAction }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, type: 'nav', value: 'dashboard' },
    { id: 'nav-chat', label: 'Go to Chat', icon: Search, type: 'nav', value: 'chat' },
    { id: 'nav-media', label: 'Go to Media Gallery', icon: Image, type: 'nav', value: 'media' },
    { id: 'nav-config', label: 'Go to Configuration', icon: FileJson, type: 'nav', value: 'config' },
    { id: 'nav-logs', label: 'Go to Logs', icon: Terminal, type: 'nav', value: 'logs' },
    { id: 'nav-memory', label: 'Go to Memory', icon: Brain, type: 'nav', value: 'memory' },
    { id: 'nav-settings', label: 'Go to Settings', icon: Settings, type: 'nav', value: 'settings' },
    { id: 'act-start', label: 'Start Training', icon: Play, type: 'action', value: 'start_training' },
    { id: 'act-stop', label: 'Stop Training', icon: Square, type: 'action', value: 'stop_training' },
    { id: 'act-clear', label: 'Clear Logs', icon: Eraser, type: 'action', value: 'clear_logs' },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(filteredCommands[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const execute = (cmd: any) => {
    if (cmd.type === 'nav') {
      onNavigate(cmd.value as View);
    } else {
      onAction(cmd.value);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-32 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-[600px] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-4 border-b border-slate-800">
            <Search className="text-slate-500 mr-3" size={20} />
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-lg"
            />
            <div className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400">ESC</div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">No results found.</div>
            ) : (
                filteredCommands.map((cmd, idx) => (
                    <button
                        key={cmd.id}
                        onClick={() => execute(cmd)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-left transition-colors ${
                            idx === selectedIndex ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                        onMouseEnter={() => setSelectedIndex(idx)}
                    >
                        <cmd.icon size={18} className={idx === selectedIndex ? 'text-white' : 'text-slate-500'} />
                        {cmd.label}
                    </button>
                ))
            )}
        </div>
        <div className="p-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between px-4">
            <span>ProTip: Use arrows to navigate</span>
            <span>AgentEvolver v2.4</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
