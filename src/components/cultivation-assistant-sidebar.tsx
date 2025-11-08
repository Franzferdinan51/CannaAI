'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Leaf,
  Bug,
  Beaker,
  TrendingUp,
  Camera,
  AlertTriangle,
  Droplets,
  Thermometer,
  Sun,
  Wind,
  Calendar,
  MessageCircle,
  X,
  Sparkles
} from 'lucide-react';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp?: string;
  type?: 'analysis' | 'recommendation' | 'alert' | 'diagnosis';
  confidence?: number;
  urgency?: 'low' | 'medium' | 'high';
}

export interface PlantContext {
  plantId?: string;
  strain?: string;
  growthStage?: 'seedling' | 'vegetative' | 'flowering' | 'harvest';
  age?: number;
  environment?: {
    temperature?: number;
    humidity?: number;
    ph?: number;
    ec?: number;
    lightHours?: number;
  };
  lastAnalysis?: {
    healthScore?: number;
    issues?: string[];
    recommendations?: string[];
  };
}

interface CultivationAssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  context?: PlantContext | null;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onQuickAction?: (action: string) => void;
  className?: string;
}

const CultivationAssistantSidebar: React.FC<CultivationAssistantSidebarProps> = ({
  isOpen, onClose, context, messages, isLoading, onSendMessage, onQuickAction, className
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text);
    setText('');
  };

  const getUrgencyColor = (urgency?: string): string => {
    switch (urgency) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'analysis': return <Camera className="h-4 w-4" />;
      case 'recommendation': return <TrendingUp className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'diagnosis': return <Bug className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const quickActions = [
    {
      icon: <Camera className="h-4 w-4" />,
      label: 'Analyze Plant',
      action: 'analyze',
      description: 'Take a photo for analysis'
    },
    {
      icon: <Bug className="h-4 w-4" />,
      label: 'Check Issues',
      action: 'diagnose',
      description: 'Diagnose potential problems'
    },
    {
      icon: <Droplets className="h-4 w-4" />,
      label: 'Nutrient Advice',
      action: 'nutrients',
      description: 'Get feeding recommendations'
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Growth Tips',
      action: 'tips',
      description: 'Optimize growing conditions'
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'Harvest Ready?',
      action: 'harvest',
      description: 'Check harvest readiness'
    }
  ];

  const contextInfo = context ? [
    context.strain && { icon: <Leaf className="h-4 w-4" />, label: 'Strain', value: context.strain },
    context.growthStage && { icon: <TrendingUp className="h-4 w-4" />, label: 'Stage', value: context.growthStage },
    context.age && { icon: <Calendar className="h-4 w-4" />, label: 'Age', value: `${context.age} days` },
    context.environment?.temperature && { icon: <Thermometer className="h-4 w-4" />, label: 'Temp', value: `${context.environment.temperature}°C` },
    context.environment?.humidity && { icon: <Wind className="h-4 w-4" />, label: 'Humidity', value: `${context.environment.humidity}%` },
    context.environment?.ph && { icon: <Beaker className="h-4 w-4" />, label: 'pH', value: context.environment.ph },
    context.lastAnalysis?.healthScore && { icon: <Sparkles className="h-4 w-4" />, label: 'Health', value: `${Math.round(context.lastAnalysis.healthScore * 100)}%` }
  ].filter(Boolean) : [];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full bg-slate-900/95 backdrop-blur-lg border-l border-slate-700 w-full max-w-md z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${className} ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cultivation Assistant</h2>
              {context?.strain && (
                <p className="text-sm text-emerald-400">{context.strain} • {context.growthStage}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Context Info */}
        {contextInfo.length > 0 && (
          <div className="p-3 border-b border-slate-700">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {contextInfo.map((info: any, index) => (
                <div key={index} className="flex items-center space-x-1.5 text-slate-300">
                  <div className="text-slate-400">{info.icon}</div>
                  <span className="font-medium">{info.label}:</span>
                  <span className="text-slate-400">{info.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {onQuickAction && (
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => (
                <Button
                  key={action.action}
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickAction(action.action)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50 h-auto p-2 flex flex-col items-center space-y-1"
                >
                  {action.icon}
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Leaf className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-2">Ask me anything about your plants!</p>
              <p className="text-slate-500 text-xs">I can help with analysis, diagnosis, nutrients, and harvesting.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                {msg.type && msg.sender === 'bot' && (
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex items-center space-x-1 text-xs text-slate-400">
                      {getMessageIcon(msg.type)}
                      <span className="capitalize">{msg.type}</span>
                    </div>
                    {msg.urgency && (
                      <Badge className={`text-xs ${getUrgencyColor(msg.urgency)} border`}>
                        {msg.urgency}
                      </Badge>
                    )}
                    {msg.confidence && (
                      <span className="text-xs text-slate-500">
                        {Math.round(msg.confidence * 100)}% confident
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.timestamp && (
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages.length > 0 && messages[messages.length - 1]?.sender === 'user' && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-slate-400">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center space-x-2 bg-slate-800/50 border border-slate-600 rounded-lg p-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask about your cultivation..."
                className="flex-1 bg-transparent focus:outline-none text-slate-200 placeholder:text-slate-400 text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !text.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 h-auto"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
};

export default CultivationAssistantSidebar;