import { ChatMode } from '../types/assistant';
import {
  MessageSquare,
  Brain,
  Calendar,
  Target,
  Search,
  Settings,
  Bug,
  AlertCircle,
  TrendingUp,
  Beaker,
  Package,
  Zap,
  Activity,
  Eye
} from 'lucide-react';

export const modeCategories = {
  'General': {
    modes: ['chat', 'thinking'],
    icon: <MessageSquare className="h-4 w-4" />
  },
  'Planning': {
    modes: ['study-plan', 'quiz', 'research', 'planner'],
    icon: <Calendar className="h-4 w-4" />
  },
  'Analysis': {
    modes: ['analysis', 'diagnosis', 'troubleshoot'],
    icon: <Search className="h-4 w-4" />
  },
  'Specialized': {
    modes: ['recommendation', 'trichome', 'harvest'],
    icon: <Target className="h-4 w-4" />
  },
  'Agentic': {
    modes: ['autonomous', 'proactive', 'predictive', 'monitor'],
    icon: <Brain className="h-4 w-4" />
  }
};

export const allModes: Record<ChatMode, { name: string; icon: React.ReactNode; description: string; color: string }> = {
  chat: { name: 'Chat', icon: <MessageSquare className="h-4 w-4" />, description: 'General conversation', color: 'from-blue-600 to-cyan-600' },
  thinking: { name: 'Deep Analysis', icon: <Brain className="h-4 w-4" />, description: 'Thorough reasoning', color: 'from-purple-600 to-pink-600' },
  'study-plan': { name: 'Growth Plan', icon: <Calendar className="h-4 w-4" />, description: 'Create cultivation schedule', color: 'from-green-600 to-emerald-600' },
  quiz: { name: 'Quiz', icon: <Target className="h-4 w-4" />, description: 'Test your knowledge', color: 'from-orange-600 to-red-600' },
  research: { name: 'Research', icon: <Search className="h-4 w-4" />, description: 'Scientific analysis', color: 'from-indigo-600 to-blue-600' },
  troubleshoot: { name: 'Troubleshoot', icon: <Settings className="h-4 w-4" />, description: 'Problem solving', color: 'from-slate-600 to-gray-600' },
  analysis: { name: 'Plant Analysis', icon: <Bug className="h-4 w-4" />, description: 'Analyze plant health', color: 'from-emerald-600 to-teal-600' },
  diagnosis: { name: 'Diagnosis', icon: <AlertCircle className="h-4 w-4" />, description: 'Diagnose problems', color: 'from-red-600 to-orange-600' },
  recommendation: { name: 'Growing Advice', icon: <TrendingUp className="h-4 w-4" />, description: 'Get recommendations', color: 'from-blue-600 to-purple-600' },
  trichome: { name: 'Trichome', icon: <Beaker className="h-4 w-4" />, description: 'Trichome analysis', color: 'from-amber-600 to-yellow-600' },
  harvest: { name: 'Harvest', icon: <Package className="h-4 w-4" />, description: 'Harvest planning', color: 'from-green-600 to-lime-600' },
  autonomous: { name: 'Autonomous', icon: <Zap className="h-4 w-4" />, description: 'AI-powered automation', color: 'from-violet-600 to-purple-600' },
  proactive: { name: 'Proactive', icon: <Activity className="h-4 w-4" />, description: 'Proactive monitoring', color: 'from-cyan-600 to-blue-600' },
  predictive: { name: 'Predictive', icon: <TrendingUp className="h-4 w-4" />, description: 'Predictive analysis', color: 'from-orange-600 to-red-600' },
  planner: { name: 'Planner', icon: <Calendar className="h-4 w-4" />, description: 'Strategic planning', color: 'from-green-600 to-emerald-600' },
  monitor: { name: 'Monitor', icon: <Eye className="h-4 w-4" />, description: 'Continuous monitoring', color: 'from-blue-600 to-indigo-600' }
};
