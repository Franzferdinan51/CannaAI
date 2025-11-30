import { QuickAction } from '../types/assistant';
import {
  Bug,
  AlertTriangle,
  Beaker,
  TrendingUp,
  Package,
  Zap,
  Activity
} from 'lucide-react';

export const quickActions: QuickAction[] = [
  {
    id: 'analyze-plant',
    name: 'Analyze Plant',
    description: 'Check plant health and identify issues',
    icon: <Bug className="h-4 w-4" />,
    mode: 'analysis',
    color: 'from-emerald-600 to-teal-600'
  },
  {
    id: 'check-issues',
    name: 'Check Issues',
    description: 'Identify problems and solutions',
    icon: <AlertTriangle className="h-4 w-4" />,
    mode: 'diagnosis',
    color: 'from-red-600 to-orange-600'
  },
  {
    id: 'nutrient-advice',
    name: 'Nutrient Advice',
    description: 'Get feeding recommendations',
    icon: <Beaker className="h-4 w-4" />,
    mode: 'recommendation',
    color: 'from-blue-600 to-purple-600'
  },
  {
    id: 'growth-tips',
    name: 'Growth Tips',
    description: 'Optimize growing conditions',
    icon: <TrendingUp className="h-4 w-4" />,
    mode: 'recommendation',
    color: 'from-green-600 to-emerald-600'
  },
  {
    id: 'harvest-ready',
    name: 'Harvest Ready?',
    description: 'Check harvest readiness',
    icon: <Package className="h-4 w-4" />,
    mode: 'harvest',
    color: 'from-green-600 to-lime-600'
  },
  {
    id: 'autonomous-check',
    name: 'Autonomous Check',
    description: 'Run comprehensive autonomous analysis',
    icon: <Zap className="h-4 w-4" />,
    mode: 'autonomous',
    color: 'from-violet-600 to-purple-600'
  },
  {
    id: 'proactive-scan',
    name: 'Proactive Scan',
    description: 'Scan for potential issues and improvements',
    icon: <Activity className="h-4 w-4" />,
    mode: 'proactive',
    color: 'from-cyan-600 to-blue-600'
  },
  {
    id: 'predict-health',
    name: 'Predict Health',
    description: 'Analyze trends and predict future outcomes',
    icon: <TrendingUp className="h-4 w-4" />,
    mode: 'predictive',
    color: 'from-orange-600 to-red-600'
  }
];
