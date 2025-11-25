'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Clock,
  Zap,
  Brain,
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Settings,
  PieChart,
  Activity,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';

import { ChatAnalytics, ChatConversation, ChatMessage } from './types';

interface ChatAnalyticsProps {
  analytics: ChatAnalytics;
  conversations: ChatConversation[];
  messages: ChatMessage[];
  onClose?: () => void;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
  className?: string;
}

export function ChatAnalytics({
  analytics,
  conversations,
  messages,
  onClose,
  onExport,
  className = ''
}: ChatAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showDetails, setShowDetails] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const now = new Date();
    let cutoffDate = new Date();

    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        cutoffDate = new Date(0);
        break;
    }

    const filteredConversations = conversations.filter(
      conv => new Date(conv.updatedAt) >= cutoffDate
    );

    const filteredMessages = messages.filter(
      msg => msg.timestamp >= cutoffDate
    );

    return {
      conversations: filteredConversations,
      messages: filteredMessages
    };
  }, [conversations, messages, timeRange]);

  // Calculate additional metrics
  const additionalMetrics = useMemo(() => {
    const { conversations, messages } = filteredData;

    // Average messages per conversation
    const avgMessagesPerConv = conversations.length > 0
      ? messages.length / conversations.length
      : 0;

    // Most active day
    const messagesByDay = new Map<string, number>();
    messages.forEach(msg => {
      const day = msg.timestamp.toISOString().split('T')[0];
      messagesByDay.set(day, (messagesByDay.get(day) || 0) + 1);
    });

    const mostActiveDay = Array.from(messagesByDay.entries())
      .sort((a, b) => b[1] - a[1])[0];

    // Conversation completion rate (conversations with user responses)
    const completedConversations = conversations.filter(conv =>
      conv.messages.some(msg => msg.role === 'user') &&
      conv.messages.some(msg => msg.role === 'assistant')
    ).length;

    const completionRate = conversations.length > 0
      ? (completedConversations / conversations.length) * 100
      : 0;

    // Top topics (simple keyword extraction)
    const topicCounts = new Map<string, number>();
    const topics = ['nutrient', 'temperature', 'humidity', 'ph', 'light', 'water', 'harvest', 'flower', 'vegetative', 'pest', 'disease'];

    messages.forEach(msg => {
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        topics.forEach(topic => {
          if (content.includes(topic)) {
            topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
          }
        });
      }
    });

    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Response time distribution
    const responseTimes = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const currentMsg = messages[i];
      const nextMsg = messages[i + 1];

      if (currentMsg.role === 'user' && nextMsg.role === 'assistant') {
        const timeDiff = nextMsg.timestamp.getTime() - currentMsg.timestamp.getTime();
        responseTimes.push(timeDiff / 1000); // Convert to seconds
      }
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      avgMessagesPerConv,
      mostActiveDay,
      completionRate,
      topTopics,
      avgResponseTime,
      totalResponseTime: responseTimes.reduce((a, b) => a + b, 0)
    };
  }, [filteredData]);

  // Format time range
  const formatTimeRange = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case 'all': return 'All Time';
      default: return 'Custom';
    }
  };

  // Format number
  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  // Get health status
  const getHealthStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return { status: 'good', color: 'text-green-400', icon: CheckCircle };
    if (value >= thresholds.warning) return { status: 'warning', color: 'text-yellow-400', icon: AlertTriangle };
    return { status: 'poor', color: 'text-red-400', icon: AlertTriangle };
  };

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Chat Analytics</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-white"
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <Info className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-gray-400">Analytics for {formatTimeRange()}</p>
      </div>

      {/* Key Metrics */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Messages */}
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">
                {formatNumber(analytics.totalMessages)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Total Messages</p>
            <div className="mt-2 text-xs text-gray-500">
              +{formatNumber(filteredData.messages.length * 0.1)} from last period
            </div>
          </div>

          {/* Total Conversations */}
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {formatNumber(analytics.totalConversations)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Total Conversations</p>
            <div className="mt-2 text-xs text-gray-500">
              {formatNumber(additionalMetrics.avgMessagesPerConv, 0)} avg messages per conversation
            </div>
          </div>

          {/* Average Response Time */}
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">
                {formatDuration(analytics.averageResponseTime / 1000)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Avg Response Time</p>
            <div className="mt-2 text-xs text-gray-500">
              {getHealthStatus(100 - (analytics.averageResponseTime / 1000) * 10, { good: 80, warning: 60 }).status === 'good' ? '✓ Fast' : '⚠ Slower than ideal'}
            </div>
          </div>

          {/* Error Rate */}
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-red-400" />
              <span className="text-2xl font-bold text-white">
                {formatNumber(analytics.errorRate * 100, 1)}%
              </span>
            </div>
            <p className="text-gray-400 text-sm">Error Rate</p>
            <div className="mt-2 text-xs text-gray-500">
              {getHealthStatus(100 - analytics.errorRate * 100, { good: 95, warning: 90 }).status === 'good' ? '✓ Excellent' : '⚠ Needs attention'}
            </div>
          </div>
        </div>

        {showDetails && (
          <>
            {/* Usage Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Daily Usage Chart */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Daily Usage
                </h3>
                <div className="h-48 flex items-end space-x-1">
                  {analytics.dailyUsage.slice(-14).map((day, index) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-t"
                      style={{ height: `${Math.min(100, (day.messages / Math.max(...analytics.dailyUsage.map(d => d.messages))) * 100)}%` }}
                      title={`${day.date}: ${day.messages} messages`}
                    />
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-400">Last 14 days</div>
              </div>

              {/* Provider Usage */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  AI Provider Usage
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics.providerUsage).map(([provider, count]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{provider}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(count / Math.max(...Object.values(analytics.providerUsage))) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-white text-sm w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Topic Analysis */}
            {additionalMetrics.topTopics.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Popular Topics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {additionalMetrics.topTopics.map(([topic, count]) => (
                    <div key={topic} className="bg-gray-600 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white mb-1">{count}</div>
                      <div className="text-xs text-gray-300 capitalize">{topic}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Conversation Stats */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Conversations
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Completion Rate</span>
                    <span className="text-white">{formatNumber(additionalMetrics.completionRate, 1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Messages</span>
                    <span className="text-white">{formatNumber(additionalMetrics.avgMessagesPerConv, 1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Most Active Day</span>
                    <span className="text-white">
                      {additionalMetrics.mostActiveDay
                        ? new Date(additionalMetrics.mostActiveDay[0]).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Response Time</span>
                    <span className="text-white">{formatDuration(additionalMetrics.avgResponseTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Processing</span>
                    <span className="text-white">{formatDuration(additionalMetrics.totalResponseTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="text-white">{formatNumber((1 - analytics.errorRate) * 100, 1)}%</span>
                  </div>
                </div>
              </div>

              {/* User Satisfaction */}
              {analytics.userSatisfactionScore && (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-400" />
                    Satisfaction
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Rating</span>
                      <span className="text-white">{formatNumber(analytics.userSatisfactionScore, 1)}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Positive</span>
                      <span className="text-green-400">{formatNumber(analytics.sentimentAnalysis?.positive * 100, 1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Neutral</span>
                      <span className="text-yellow-400">{formatNumber(analytics.sentimentAnalysis?.neutral * 100, 1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Export Options */}
        <div className="flex items-center justify-between border-t border-gray-600 pt-6">
          <div className="text-sm text-gray-400">
            Generated on {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport('csv')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport('json')}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatAnalytics;