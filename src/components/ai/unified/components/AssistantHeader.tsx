import { Button } from '@/components/ui/button';
import { Minimize2, Maximize2, X, Grid3x3, Brain } from 'lucide-react';

interface AssistantHeaderProps {
  isMinimized: boolean;
  chatMode: string;
  modeInfo: { name: string; icon: React.ReactNode };
  onMinimize: () => void;
  onClose: () => void;
  onModeSelector: () => void;
  onToggleQuickActions: () => void;
  showQuickActions: boolean;
  agenticEnabled: boolean;
}

export const AssistantHeader = ({
  isMinimized,
  chatMode,
  modeInfo,
  onMinimize,
  onClose,
  onModeSelector,
  onToggleQuickActions,
  showQuickActions,
  agenticEnabled
}: AssistantHeaderProps) => {
  return (
    <div
      className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-600 cursor-move"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onModeSelector}
          className="text-blue-400 hover:text-blue-300 hover:bg-slate-700"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-2">
          {modeInfo.icon}
          <span className="text-sm text-slate-200">{modeInfo.name}</span>
        </div>
        {agenticEnabled && (
          <div className="flex items-center space-x-1 bg-violet-600 text-white px-2 py-0.5 rounded-full text-xs">
            <Brain className="h-3 w-3" />
            <span>Agentic</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleQuickActions}
          className={`text-slate-400 hover:text-slate-200 hover:bg-slate-700 ${showQuickActions ? 'bg-slate-700' : ''}`}
          title="Toggle quick actions"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onMinimize}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="text-slate-400 hover:text-red-400 hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
