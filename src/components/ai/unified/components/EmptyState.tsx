import { Bot } from 'lucide-react';

interface EmptyStateProps {
  agenticEnabled?: boolean;
}

export const EmptyState = ({ agenticEnabled = false }: EmptyStateProps) => {
  return (
    <div className="text-center text-slate-400 py-8">
      <Bot className="h-12 w-12 mx-auto mb-3 text-slate-500" />
      <p className="text-sm font-medium">Ask me about cultivation!</p>
      <p className="text-xs mt-1">Click the grid icon to explore all modes!</p>
      {agenticEnabled && (
        <p className="text-xs mt-2 text-violet-400">
          🧠 Agentic AI is actively monitoring your plants
        </p>
      )}
    </div>
  );
};
