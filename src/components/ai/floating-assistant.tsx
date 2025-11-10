'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  SendHorizontal,
  Minimize2,
  Maximize2,
  X,
  MessageSquare,
  Sparkles,
  Leaf,
  Droplets,
  Thermometer,
  Sun,
  Eye,
  Camera,
  AlertCircle,
  CheckCircle,
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';
import { createClientAIService } from '@/lib/ai/client-ai-service';
import AIConfigManager from '@/components/ai/config/ai-config-manager';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: any;
}

interface PageContext {
  page: string;
  title: string;
  data?: any;
  sensorData?: any;
}

interface FloatingAIAssistantProps {
  initialContext?: PageContext;
  className?: string;
}

export default function FloatingAIAssistant({
  initialContext,
  className = ""
}: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<PageContext>(initialContext || {
    page: 'unknown',
    title: 'CannaAI Pro'
  });
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aiConfig, setAIConfig] = useState<any>(null);
  const [aiService, setAIService] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // Update context based on current page
  const updateContext = (newContext: PageContext) => {
    setContext(newContext);
  };

  // Initialize AI service when config changes
  useEffect(() => {
    if (aiConfig) {
      const service = createClientAIService(aiConfig);
      setAIService(service);

      // Test connection
      setConnectionStatus('testing');
      service.testConnection().then((success: boolean) => {
        setConnectionStatus(success ? 'connected' : 'disconnected');
      }).catch(() => {
        setConnectionStatus('disconnected');
      });
    }
  }, [aiConfig]);

  // Handle AI configuration changes
  const handleAIConfigChange = (config: any) => {
    setAIConfig(config);
  };

  // Make this function available globally
  useEffect(() => {
    (window as any).updateAIContext = updateContext;
    return () => {
      delete (window as any).updateAIContext;
    };
  }, []);

  // Handle mouse and touch events for dragging
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isDragging) {
        const maxX = window.innerWidth - (window.innerWidth < 640 ? window.innerWidth - 32 : 320);
        const maxY = window.innerHeight - 200;
        setPosition({
          x: Math.max(0, Math.min(maxX, clientX - dragStart.x)),
          y: Math.max(0, Math.min(maxY, clientY - dragStart.y))
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
      };
    }
  }, [isDragging, dragStart]);

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!aiService) {
        throw new Error('AI service not configured. Please set up your AI configuration.');
      }

      const response = await aiService.generateResponse(input.trim(), context);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.content,
        timestamp: new Date(),
        context: {
          model: response.model,
          provider: response.provider,
          processingTime: response.processingTime,
          fallback: response.fallback
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Generate contextual greeting
  const getContextualGreeting = () => {
    switch (context.page) {
      case 'dashboard':
        return "🌱 Welcome back! I'm here to help with your cultivation overview.";
      case 'live-vision':
        return "📷 Ready to analyze your plants! Upload an image or ask me about visual symptoms.";
      case 'all-tools':
        return "🛠️ Explore the tools! I can help you understand any cultivation technique.";
      case 'settings':
        return "⚙️ Settings central! I can help optimize your system configuration.";
      default:
        return "🌿 Hello! I'm your CannaAI assistant. How can I help with your cultivation today?";
    }
  };

  // Render contextual indicator
  const renderContextIndicator = () => {
    const contextIcons = {
      dashboard: <Leaf className="h-3 w-3" />,
      'live-vision': <Camera className="h-3 w-3" />,
      'all-tools': <Bot className="h-3 w-3" />,
      settings: <Sparkles className="h-3 w-3" />
    };

    const contextColors = {
      dashboard: 'bg-green-600',
      'live-vision': 'bg-blue-600',
      'all-tools': 'bg-purple-600',
      settings: 'bg-orange-600'
    };

    return (
      <Badge className={`${contextColors[context.page as keyof typeof contextColors] || 'bg-slate-600'} text-white text-xs`}>
        {contextIcons[context.page as keyof typeof contextIcons] || <Leaf className="h-3 w-3" />}
        <span className="ml-1">{context.title}</span>
      </Badge>
    );
  };

  return (
    <AIConfigManager onConfigChange={handleAIConfigChange}>
      <div className={`fixed z-50 ${className}`}>
        {/* Floating button when closed */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative"
            >
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                }}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white rounded-full shadow-lg border-2 border-white/20 h-14 w-14 sm:h-auto sm:w-auto sm:px-4"
                style={{
                  position: 'fixed',
                  bottom: '20px',
                  right: '20px',
                  zIndex: 9998
                }}
              >
                <Bot className="h-6 w-6 sm:mr-2" />
                <span className="hidden sm:inline">AI Assistant</span>
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400' :
                  connectionStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
                  'bg-red-400'
                }`} />
              </Button>

              {/* Connection status indicator */}
              <div className="absolute -top-1 -left-1">
                {connectionStatus === 'connected' ? (
                  <Wifi className="h-3 w-3 text-green-400" />
                ) : connectionStatus === 'testing' ? (
                  <Wifi className="h-3 w-3 text-yellow-400 animate-pulse" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-400" />
                )}
              </div>

              {/* Context tooltip */}
              <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-lg whitespace-nowrap">
                {getContextualGreeting()}
                {!aiService && (
                  <div className="text-yellow-400 mt-1">
                    ⚠️ AI not configured - Click AI Config button
                  </div>
                )}
                <div className="absolute bottom-0 right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden ${isMinimized ? 'h-auto' : 'h-[500px] sm:h-[600px]'} w-[calc(100vw-2rem)] sm:w-[350px] md:w-[400px] max-w-[400px]`}
            style={{
              position: 'fixed',
              bottom: isDragging ? `${position.y}px` : '20px',
              right: isDragging ? (position.x > window.innerWidth - 420 ? '20px' : `${position.x}px`) : '20px',
              left: isDragging && position.x <= window.innerWidth - 420 ? `${position.x}px` : 'auto',
              transform: isDragging && position.x <= window.innerWidth - 420 ? 'none' : 'translateX(0)',
              zIndex: 9999
            }}
          >
            {/* Header */}
            <div
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-3 flex items-center justify-between cursor-move touch-none no-select"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span className="font-semibold">CannaAI Assistant</span>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                  connectionStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
                  'bg-red-400'
                }`} />
                {connectionStatus === 'connected' && aiConfig && (
                  <span className="text-xs text-green-100">
                    ({aiConfig.provider === 'fallback' ? 'Fallback' : aiConfig.provider})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                {!aiService && (
                  <div className="text-xs text-yellow-200 mr-2">
                    Configure AI
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Context bar */}
            {!isMinimized && (
              <div className="bg-slate-800 px-3 py-2 border-b border-slate-600">
                <div className="flex items-center justify-between">
                  {renderContextIndicator()}
                  {context.sensorData && (
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Thermometer className="h-3 w-3" />
                      <span>{Math.round((context.sensorData.temperature * 9/5) + 32)}°F</span>
                      <Droplets className="h-3 w-3 ml-1" />
                      <span>{context.sensorData.humidity}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages area */}
            {!isMinimized && (
              <div className="flex flex-col h-[calc(100%-140px)]">
                <ScrollArea className="flex-1 p-3 scrollbar-chat chat-container" style={{ height: '100%', maxHeight: 'calc(600px - 140px)' }}>
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center text-slate-400 py-8">
                        <Bot className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                        <p className="text-sm font-medium">{getContextualGreeting()}</p>
                        <p className="text-xs mt-1">Ask me anything about cannabis cultivation!</p>
                      </div>
                    )}

                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg text-sm ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white ml-auto'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <div className={`flex items-center justify-between mt-1 text-xs ${
                            message.type === 'user' ? 'text-blue-200' : 'text-slate-400'
                          }`}>
                            <span>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.context?.model && (
                              <span className="ml-2">{message.context.provider}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-slate-700 text-slate-200 p-3 rounded-lg text-sm max-w-[80%]">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            <span>Thinking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input area */}
                <div className="border-t border-slate-600 p-3">
                  <div className="flex space-x-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about cultivation..."
                      className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!input.trim() || isLoading}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </AIConfigManager>
  );
}