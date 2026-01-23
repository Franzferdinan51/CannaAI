
import React, { useEffect, useRef, useState } from 'react';
import { LogMessage } from '../types';
import { Download, Eraser, Pause, Play, Terminal, ThumbsUp, ThumbsDown, Sliders } from 'lucide-react';

interface LogConsoleProps {
  logs: LogMessage[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  onRewardSignal: (val: number) => void;
}

const LogConsole: React.FC<LogConsoleProps> = ({ logs, isPaused, onTogglePause, onClear, onRewardSignal }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [matrixMode, setMatrixMode] = useState(false);
  const [rewardVal, setRewardVal] = useState(0);

  useEffect(() => {
    if (!isPaused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const handleRewardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setRewardVal(val);
  };

  const commitReward = () => {
      onRewardSignal(rewardVal);
      setRewardVal(0);
  };

  const containerClasses = matrixMode
    ? "fixed inset-0 z-[100] bg-black text-green-500 font-mono p-4"
    : "flex flex-col h-full bg-[#0a0a0a] rounded-xl border border-slate-800 overflow-hidden shadow-2xl";

  return (
    <div className={containerClasses}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${matrixMode ? 'border-green-900 bg-black' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex items-center gap-2">
          {!matrixMode && (
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
          )}
          <span className={`text-xs font-mono ml-2 ${matrixMode ? 'text-green-500 animate-pulse' : 'text-slate-400'}`}>
              {matrixMode ? '>>> SYSTEM_ROOT_ACCESS_GRANTED' : 'stdout / stderr'}
          </span>
        </div>

        {/* Human Feedback Slider */}
        <div className={`hidden md:flex items-center gap-3 px-3 py-1 rounded-full border ${matrixMode ? 'border-green-900 bg-black' : 'bg-slate-950 border-slate-700'}`}>
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Sliders size={10} /> Human Reward
            </span>
            <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={rewardVal}
                onChange={handleRewardChange}
                onMouseUp={commitReward}
                onTouchEnd={commitReward}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
            <span className={`text-xs font-mono w-8 text-right ${rewardVal > 0 ? 'text-green-500' : rewardVal < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                {rewardVal.toFixed(1)}
            </span>
        </div>

        <div className="flex items-center gap-2">
           <button
            onClick={() => setMatrixMode(!matrixMode)}
            className={`p-1.5 rounded transition-colors ${matrixMode ? 'text-green-500 hover:text-green-400 bg-green-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Matrix Zen Mode"
          >
            <Terminal size={14} />
          </button>
          <button
            onClick={onTogglePause}
            className={`p-1.5 rounded transition-colors ${matrixMode ? 'text-green-600 hover:text-green-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title={isPaused ? "Resume Scroll" : "Pause Scroll"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            onClick={onClear}
            className={`p-1.5 rounded transition-colors ${matrixMode ? 'text-green-600 hover:text-green-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Clear Logs"
          >
            <Eraser size={14} />
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 font-mono text-xs custom-scroll ${matrixMode ? 'text-green-500' : ''}`}>
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <p>{matrixMode ? 'WAITING_FOR_INPUT...' : 'Waiting for process logs...'}</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`mb-1 flex gap-3 p-0.5 rounded ${matrixMode ? 'hover:bg-green-900/20' : 'hover:bg-slate-900/50'}`}>
              <span className={`min-w-[70px] select-none ${matrixMode ? 'text-green-700' : 'text-slate-500'}`}>{log.timestamp}</span>
              <span className={`font-bold min-w-[50px] select-none ${
                log.level === 'HUMAN_FEEDBACK' ? 'text-violet-500' :
                log.level === 'ERROR' ? 'text-red-500' :
                log.level === 'WARNING' ? 'text-yellow-500' :
                log.level === 'DEBUG' ? 'text-blue-500' :
                matrixMode ? 'text-green-400' : 'text-green-500'
              }`}>
                [{log.level === 'HUMAN_FEEDBACK' ? 'HF' : log.level}]
              </span>
              <span className={`break-all ${matrixMode ? 'text-green-500 shadow-green-500/50 drop-shadow-sm' : 'text-slate-300'}`}>
                  {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogConsole;
