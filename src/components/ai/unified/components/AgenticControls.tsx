import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Play } from 'lucide-react';
import { AgenticTrigger, AutonomousAction, AgenticContext } from '../types/assistant';

interface AgenticControlsProps {
  agenticEnabled: boolean;
  agenticContext: AgenticContext;
  agenticTriggers: AgenticTrigger[];
  autonomousActions: AutonomousAction[];
  onToggleAgentic: () => void;
  onRunAnalysis: () => void;
  onSetChatMode: (mode: any) => void;
}

export const AgenticControls = ({
  agenticEnabled,
  agenticContext,
  agenticTriggers,
  autonomousActions,
  onToggleAgentic,
  onRunAnalysis,
  onSetChatMode
}: AgenticControlsProps) => {
  return (
    <Card className="bg-slate-800 border-slate-600 mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-violet-400 flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            Agentic Controls
          </CardTitle>
          <Button
            size="sm"
            variant={agenticEnabled ? "default" : "outline"}
            className={`text-xs ${agenticEnabled ? 'bg-violet-600 text-white' : 'bg-slate-600 text-slate-300'}`}
            onClick={onToggleAgentic}
          >
            {agenticEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Mode:</span>
            <span className="ml-1 text-slate-200 font-medium capitalize">
              {agenticContext.userPreferences.automationLevel}
            </span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Risk:</span>
            <span className="ml-1 text-slate-200 font-medium capitalize">{agenticContext.riskTolerance}</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Triggers:</span>
            <span className="ml-1 text-slate-200 font-medium">
              {agenticTriggers.filter(t => t.enabled).length} active
            </span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Actions:</span>
            <span className="ml-1 text-slate-200 font-medium">
              {autonomousActions.filter(a => a.executed).length} executed
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={onRunAnalysis}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs"
          >
            <Play className="h-3 w-3 mr-1" />
            Run Analysis
          </Button>
          <Button
            size="sm"
            onClick={() => onSetChatMode('autonomous')}
            variant="outline"
            className="flex-1 bg-slate-600 text-slate-200 hover:bg-slate-500 text-xs"
          >
            <Brain className="h-3 w-3 mr-1" />
            Autonomous Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
