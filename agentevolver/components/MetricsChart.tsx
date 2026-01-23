
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { MetricPoint } from '../types';
import { TrendingUp, Activity } from 'lucide-react';

interface MetricsChartProps {
  data: MetricPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md z-50">
        <p className="text-slate-400 font-mono mb-2 border-b border-slate-800 pb-1">Step {label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span style={{ color: entry.color }} className="font-semibold flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                 {entry.name}
              </span>
              <span className="font-mono text-slate-200">{entry.value.toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
  return (
    <div className="w-full h-full flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden relative group">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center backdrop-blur-sm">
         <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-400">
                <TrendingUp size={16} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Training Dynamics</h3>
         </div>
         <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                <span className="text-slate-400">Reward</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-slate-400">Success</span>
            </div>
         </div>
      </div>

      <div className="flex-1 w-full min-h-[250px] p-2 relative">
         <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
                <linearGradient id="colorReward" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
                dataKey="step"
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                dy={10}
            />
            <YAxis
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />

            <Line
                type="monotone"
                dataKey="reward"
                name="Avg Reward"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }}
                animationDuration={500}
            />
            <Line
                type="monotone"
                dataKey="success_rate"
                name="Success Rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                animationDuration={500}
            />
            <Line
                type="monotone"
                dataKey="loss"
                name="Loss"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                animationDuration={500}
                opacity={0.5}
            />
            </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricsChart;
