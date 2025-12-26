'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Camera,
  Trash2,
  Download,
  RefreshCw,
  Eye,
  Brain,
  Send,
  Image as ImageIcon
} from 'lucide-react';

import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ScrollArea } from './ui/ScrollArea';
import { Separator } from './ui/Separator';
import { Input } from './ui/Input';
import { Alert } from './ui/Alert';

import {
  Message,
  SensorData,
  AIModel,
  PageContext,
  CannaAIAssistantSidebarProps
} from '../types';

import { apiClient, isNetworkError, getErrorMessage } from '../services/api';

// Chat input component
interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  selectedImage: string | null;
  onSendMessage: () => void;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  isLoading: boolean;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function ChatInput({
  input,
  setInput,
  selectedImage,
  onSendMessage,
  onImageUpload,
  onRemoveImage,
  isLoading,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className={`border-t border-slate-700 p-4 space-y-3 ${
      isDragging ? 'bg-emerald-950/20' : 'bg-slate-900/50'
    }`}>
      {/* Image Preview */}
      {selectedImage && (
        <div className="relative bg-slate-800/50 rounded-lg p-2 border border-slate-700">
          <img
            src={selectedImage}
            alt="Selected"
            className="w-full h-24 object-contain rounded"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 h-6 w-6 p-0"
            onClick={onRemoveImage}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div
        className="relative border border-slate-700 rounded-lg bg-slate-950/30 transition-colors hover:border-slate-600"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex items-center">
          {/* Image Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200 h-10 w-10 p-0 rounded-l-lg border-r border-slate-700"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Camera className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileInput}
          />

          {/* Text Input */}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedImage ? "Add a message with your image..." : "Ask about cultivation, plant health, or growing conditions..."}
            className="border-0 bg-transparent focus:ring-0 flex-1 text-slate-200 placeholder-slate-500"
            disabled={isLoading}
          />

          {/* Send Button */}
          <Button
            type="button"
            onClick={onSendMessage}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="text-emerald-400 hover:text-emerald-300 h-10 w-10 p-0 rounded-r-lg border-l border-slate-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-emerald-300">Drop image here</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick actions sidebar component
interface ChatSidebarActionsProps {
  onClearChat: () => void;
  onExportChat: () => void;
  sensorData: SensorData;
  currentModel?: AIModel;
}

function ChatSidebarActions({ onClearChat, onExportChat, sensorData, currentModel }: ChatSidebarActionsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full justify-start text-slate-400 hover:text-slate-200"
        >
          <Leaf className="w-4 h-4 mr-2" />
          Quick Actions
        </Button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pl-6"
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-400 hover:text-slate-200 text-xs"
                onClick={() => navigator.clipboard.writeText(`Current conditions: ${sensorData.temperature}°F, ${sensorData.humidity}% humidity`)}
              >
                <Thermometer className="w-3 h-3 mr-2" />
                Copy Conditions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-400 hover:text-slate-200 text-xs"
                onClick={() => window.open('/dashboard?view=analysis', '_self')}
              >
                <Brain className="w-3 h-3 mr-2" />
                New Analysis
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Management Actions */}
      <Separator className="bg-slate-700" />
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          className="w-full justify-start text-slate-400 hover:text-slate-200"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Chat
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExportChat}
          className="w-full justify-start text-slate-400 hover:text-slate-200"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Chat
        </Button>
      </div>

      {/* Model Info */}
      {currentModel && (
        <>
          <Separator className="bg-slate-700" />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Current Model</span>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                {currentModel.name}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Provider</span>
              <span className="text-slate-400">{currentModel.provider}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Vision</span>
              <span className={currentModel.hasVision ? 'text-emerald-400' : 'text-slate-500'}>
                {currentModel.hasVision ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Message display component
function MessageDisplay({ message }: { message: Message }) {
  if (message.isTyping) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start"
      >
        <div className="bg-emerald-800/50 border border-emerald-600/30 text-emerald-100 p-3 rounded-lg max-w-[80%]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message content */}
        <div className={`p-3 rounded-lg ${
          isUser
            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
            : 'bg-emerald-800/50 border border-emerald-600/30 text-emerald-100'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

          {/* Image attachment */}
          {message.image && (
            <div className="mt-2">
              <img
                src={message.image}
                alt="Attached"
                className="w-full h-32 object-contain rounded bg-slate-900/50"
              />
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between mt-2 text-xs opacity-70">
            <span>{message.timestamp.toLocaleTimeString()}</span>
            {message.provider && (
              <Badge variant="outline" className="border-current/30 text-current">
                {message.provider}
              </Badge>
            )}
          </div>
        </div>

        {/* Processing info for assistant messages */}
        {!isUser && message.processingTime && (
          <div className="text-xs text-slate-500 mt-1">
            Processed in {message.processingTime}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function AIAssistantSidebar({
  sensorData,
  currentModel,
  initialContext = { page: 'dashboard', title: 'CannaAI Pro Dashboard' },
  onToggleCollapse,
  className = ''
}: CannaAIAssistantSidebarProps) {
  // State management
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [width, setWidth] = useState(400);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
  const [context, setContext] = useState<PageContext>(initialContext);
  const [isDraggingWidth, setIsDraggingWidth] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
        const response = await apiClient.healthCheck();
        if (response.status === 'ok') {
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
  const sendMessage = useCallback(async () => {
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
      const response = await apiClient.sendMessage({
        message: userMessage.content,
        image: userMessage.image,
        context: context,
        sensorData: sensorData,
        mode: 'chat'
      });

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingId));

      if (response.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          model: response.model,
          provider: response.provider,
          processingTime: response.processingTime,
          context: {
            fallback: response.fallback,
            providerInfo: response.providerInfo,
            agentEvolver: response.agentEvolver
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: response.error?.userMessage || response.error?.message || 'Sorry, I encountered an error. Please check your AI provider configuration.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingId));

      let errorMessage = 'Connection failed. Please check your internet connection and AI provider configuration.';
      if (isNetworkError(error)) {
        errorMessage = 'Network error. Unable to reach AI service.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const errorResponse: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedImage, isLoading, context, sensorData]);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('cannai-chat-history');
  }, []);

  // Export chat history
  const exportChat = useCallback(() => {
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
  }, [messages]);

  // Handle image upload
  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  // Contextual greeting based on current page
  const getContextualGreeting = useCallback(() => {
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
  }, [context.page]);

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
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-emerald-500 transition-colors z-10"
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
                    <p className="text-sm font-medium text-slate-300">
                      {getContextualGreeting()}
                    </p>
                    <p className="text-xs mt-2 text-slate-500">
                      {connectionStatus === 'connected'
                        ? 'Ask me anything about cannabis cultivation!'
                        : 'Configure your AI provider to start chatting'
                      }
                    </p>
                    {connectionStatus === 'disconnected' && (
                      <Alert className="mt-4 border-amber-500/50 bg-amber-950/20">
                        <AlertCircle className="h-4 w-4" />
                        <Alert.Description className="text-amber-300">
                          AI provider is not configured.
                          <Button
                            variant="link"
                            className="p-0 h-auto ml-1 text-amber-400 hover:text-amber-300"
                            onClick={() => window.location.href = '/settings'}
                          >
                            Configure now
                          </Button>
                        </Alert.Description>
                      </Alert>
                    )}
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageDisplay key={message.id} message={message} />
                  ))
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
            <ChatSidebarActions
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