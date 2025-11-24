import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Activity, AlertCircle } from 'lucide-react';

interface AgentDashboardProps {
  sensorData?: any;
}

export function AgentDashboard({ sensorData }: AgentDashboardProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-slate-100">
          <Brain className="w-5 h-5 mr-2 text-emerald-400" />
          Agent Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-slate-300">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Live sensor snapshot integrated for agent planning.</span>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200">Sensor Data (preview)</span>
          </div>
          <pre className="text-xs text-slate-400 whitespace-pre-wrap">
            {JSON.stringify(sensorData || {}, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
