'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import {
  Bot,
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Wifi,
  WifiOff,
  AlertCircle,
  Leaf,
  Droplets,
  Thermometer,
  Sun,
  Loader2,
  Send,
  Camera,
  Trash2,
  Download,
  RefreshCw,
  Eye,
  Brain
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string;
  model?: string;
  provider?: string;
  processingTime?: string;
  isTyping?: boolean;
  context?: any;
}

interface SensorData {
  temperature: number;
  humidity: number;
  ph: number;
  soilMoisture: number;
  lightIntensity: number;
  ec: number;
  co2?: number;
  vpd?: number;
}

interface AIModel {
  name: string;
  provider: string;
  hasVision: boolean;
  isAvailable: boolean;
}

interface PageContext {
  page: string;
  title: string;
  data?: any;
}

interface CannaAIAssistantSidebarProps {
  sensorData: SensorData;
  currentModel?: AIModel;
  initialContext?: PageContext;
  onToggleCollapse?: (collapsed: boolean) => void;
  className?: string;
}

export function CannaAIAssistantSidebar({
  sensorData,
  currentModel,
  initialContext = { page: 'dashboard', title: 'CannaAI Pro Dashboard' },
  onToggleCollapse,
  className = ""
}: CannaAIAssistantSidebarProps) {
  // State management
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(400);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
  const [context, setContext] = useState<PageContext>(initialContext);
  const [isDraggingWidth, setIsDraggingWidth] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('cannai-chat-history');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setMessages(parsedHistory.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('cannai-chat-history', JSON.stringify(messages));
      }
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  }, [messages]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Test AI provider connection
  useEffect(() => {
    const testConnection = async () => {
      setConnectionStatus('testing');
      try {
        const response = await fetch('/api/chat');
        const data = await response.json();

        if (data.success && data.currentProvider !== 'fallback') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };

    testConnection();
    const interval = setInterval(testConnection, 30000); // Test every 30 seconds
    return () => clearInterval(interval);
  }, [currentModel]);

  // Handle width dragging
  const handleWidthDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingWidth(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingWidth) {
        const deltaX = e.clientX - dragStartX.current;
        const newWidth = Math.max(300, Math.min(800, dragStartWidth.current - deltaX));
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingWidth(false);
    };

    if (isDraggingWidth) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingWidth]);

  // Handle collapse toggle
  const handleToggleCollapse = useCallback(() => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onToggleCollapse?.(newCollapsedState);
  }, [isCollapsed, onToggleCollapse]);

  // Send message to AI
  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    // Add typing indicator
    const typingId = (Date.now() + 1).toString();
    const typingMessage: Message = {
      id: typingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          image: userMessage.image,
          context: context,
          sensorData: sensorData,
          mode: 'chat'
        })
      });

      const data = await response.json();

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingId));

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          model: data.model,
          provider: data.provider,
          processingTime: data.processingTime,
          context: {
            fallback: data.fallback,
            providerInfo: data.providerInfo,
            agentEvolver: data.agentEvolver
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: data.error?.userMessage || data.error || 'Sorry, I encountered an error. Please check your AI provider configuration.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingId));

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Connection failed. Please check your internet connection and AI provider configuration.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('cannai-chat-history');
  };

  // Export chat history
  const exportChat = () => {
    const chatContent = messages.map(msg =>
      `[${msg.timestamp.toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cannai-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle image upload
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  // Contextual greeting based on current page
  const getContextualGreeting = () => {
    switch (context.page) {
      case 'dashboard':
        return "🌱 Welcome back! I'm here to help with your cultivation overview.";
      case 'analysis':
        return "🔬 Ready to analyze! Upload images or ask me about plant health.";
      case 'environment':
        return "🌡️ Environmental control! I can help optimize your growing conditions.";
      case 'strains':
        return "🌿 Strain management! Ask me about genetics and cultivation requirements.";
      default:
        return "🌿 Hello! I'm your CannaAI assistant. How can I help with your cultivation today?";
    }
  };

  // If collapsed, show only toggle button
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 48 }}
        exit={{ width: 0 }}
        className={`bg-slate-900 border-l border-slate-700 flex flex-col items-center py-4 ${className}`}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className="text-slate-400 hover:text-slate-200 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-400'
          }`} />

          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
            title={connectionStatus === 'connected' ? 'AI Connected' : 'AI Disconnected'}
          >
            {connectionStatus === 'connected' ? <Bot className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: isMinimized ? 48 : width }}
      exit={{ width: 0 }}
      className={`bg-slate-900 border-l border-slate-700 flex flex-col ${className}`}
      style={{ width: isMinimized ? 48 : width }}
      ref={sidebarRef}
    >
      {/* Width resize handle */}
      <div
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-emerald-500 transition-colors"
        onMouseDown={handleWidthDragStart}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <Bot className="h-5 w-5 flex-shrink-0" />
          {!isMinimized && (
            <>
              <span className="font-semibold truncate">CannaAI Assistant</span>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                connectionStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
                'bg-red-400'
              }`} />
            </>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {!isMinimized && (
            <>
              {connectionStatus === 'connected' ? (
                <Wifi className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            onClick={handleToggleCollapse}
          >
            {isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Context bar */}
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-emerald-600 text-white text-xs">
                <Leaf className="h-3 w-3 mr-1" />
                {context.title}
              </Badge>
              {currentModel && (
                <Badge className="bg-blue-600 text-white text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  {currentModel.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <div className="flex items-center space-x-1">
                <Thermometer className="h-3 w-3" />
                <span>{Math.round((sensorData.temperature * 9/5) + 32)}°F</span>
              </div>
              <div className="flex items-center space-x-1">
                <Droplets className="h-3 w-3" />
                <span>{sensorData.humidity}%</span>
              </div>
              <div className="flex items-center space-x-1">
                <Sun className="h-3 w-3" />
                <span>{sensorData.lightIntensity}μmol</span>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <Bot className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                    <p className="text-sm font-medium text-slate-300">{getContextualGreeting()}</p>
                    <p className="text-xs mt-2 text-slate-500">
                      {connectionStatus === 'connected'
                        ? 'Ask me anything about cannabis cultivation!'
                        : 'Configure your AI provider to start chatting'
                      }
                    </p>
                    {connectionStatus === 'disconnected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-emerald-600 text-emerald-400 hover:bg-emerald-900/20"
                        onClick={() => window.location.href = '/settings'}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure AI
                      </Button>
                    )}
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-emerald-800/50 border border-emerald-600/30 text-emerald-100 p-3 rounded-lg max-w-[80%]">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <ChatInput
              input={input}
              setInput={setInput}
              selectedImage={selectedImage}
              onSendMessage={sendMessage}
              onImageUpload={handleImageUpload}
              onRemoveImage={() => setSelectedImage(null)}
              isLoading={isLoading}
              isDragging={isDraggingOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </div>

          {/* Quick actions sidebar */}
          <div className="border-t border-slate-700 p-4">
            <ChatSidebar
              onClearChat={clearChat}
              onExportChat={exportChat}
              sensorData={sensorData}
              currentModel={currentModel}
            />
          </div>
        </>
      )}

      {/* Minimized state */}
      {isMinimized && (
        <div className="flex flex-col items-center py-4 space-y-3">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-400'
          }`} />

          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
            onClick={() => setIsMinimized(false)}
            title="Expand Assistant"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
            title="AI Settings"
            onClick={() => window.location.href = '/settings'}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}