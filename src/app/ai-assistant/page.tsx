'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Settings, Badge, Bot, Eye, Cloud, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { AIProviderSettings } from '@/components/ai/AIProviderSettings';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import Link from 'next/link';

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
}

interface AIModelInfo {
  id: string;
  name: string;
  provider: string;
  hasVision: boolean;
  visionConfidence: number;
  isAvailable: boolean;
}

interface ChatSettings {
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableHistory: boolean;
  autoSave: boolean;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "🌱 Hello! I'm your cannabis cultivation AI assistant. I can help you with:\n\n• Plant health analysis and diagnosis\n• Nutrient recommendations\n• Environmental control advice\n• Strain-specific guidance\n• Troubleshooting common issues\n\nFeel free to ask questions or upload images of your plants for analysis. How can I assist you today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [settings, setSettings] = useState<ChatSettings>({
    model: '',
    provider: 'lm-studio',
    temperature: 0.7,
    maxTokens: 800,
    systemPrompt: 'You are CultivAI Assistant, an expert cannabis cultivation AI. Provide helpful, accurate advice about plant care, nutrients, environmental conditions, and troubleshooting.',
    enableHistory: true,
    autoSave: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: 24,
    humidity: 65,
    ph: 6.2,
    soilMoisture: 72,
    lightIntensity: 450,
    ec: 1.8
  });
  const router = useRouter();

  useEffect(() => {
    loadModelsAndSettings();
    loadMessagesFromStorage();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (settings.autoSave) {
      saveMessagesToStorage();
    }
  }, [messages, settings.autoSave]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModelsAndSettings = async () => {
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();

      if (data.success) {
        setModels([
          ...(data.lmStudioDetails?.allModels || []).map((model: any) => ({
            id: model.id,
            name: model.id,
            provider: 'lm-studio',
            hasVision: model.hasVision,
            visionConfidence: model.visionConfidence,
            isAvailable: true
          })),
          {
            id: data.settings?.openRouter?.model || 'meta-llama/llama-3.1-8b-instruct:free',
            name: data.settings?.openRouter?.model || 'Llama 3.1 8B',
            provider: 'openrouter',
            hasVision: false,
            visionConfidence: 0,
            isAvailable: !!data.settings?.openRouter?.apiKey
          }
        ]);

        if (data.currentProvider) {
          setSettings(prev => ({
            ...prev,
            provider: data.currentProvider,
            model: data.settings?.[data.currentProvider === 'openrouter' ? 'openRouter' : 'lmStudio']?.model || ''
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadMessagesFromStorage = () => {
    if (typeof window !== 'undefined' && settings.enableHistory) {
      try {
        const stored = localStorage.getItem('ai-assistant-messages');
        if (stored) {
          const parsedMessages = JSON.parse(stored);
          setMessages(parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        }
      } catch (error) {
        console.error('Failed to load messages from storage:', error);
      }
    }
  };

  const saveMessagesToStorage = () => {
    if (typeof window !== 'undefined' && settings.enableHistory) {
      try {
        localStorage.setItem('ai-assistant-messages', JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save messages to storage:', error);
      }
    }
  };

  const handleImageUpload = (file: File) => {
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      if (file.size > 20 * 1024 * 1024) {
        alert('Image size must be less than 20MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  
  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

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
    setMessages(prev => [...prev, {
      id: typingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          model: settings.model,
          image: userMessage.image,
          sensorData: sensorData
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
          processingTime: data.processingTime
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `❌ Error: ${data.error || 'Failed to get response from AI assistant'}`,
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
        content: '❌ Sorry, I encountered an error while processing your request. Please check your AI provider settings and try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  
  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "🌱 Chat history cleared. How can I help you with your cannabis cultivation today?",
      timestamp: new Date(),
    }]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ai-assistant-messages');
    }
  };

  const exportChat = () => {
    const chatText = messages
      .map(msg => `[${formatTimestamp(msg.timestamp)}] ${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-assistant-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentModel = models.find(m => m.id === settings.model);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-emerald-100">AI Assistant</h1>
                <p className="text-emerald-300 text-sm">Your intelligent cannabis cultivation companion</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentModel && (
                <Badge variant="secondary" className="bg-emerald-800/50 text-emerald-200 border-emerald-700">
                  <Bot className="h-3 w-3 mr-1" />
                  {currentModel.name}
                  {currentModel.hasVision && <Eye className="h-3 w-3 ml-1" />}
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="bg-emerald-800/50 border-emerald-700 text-emerald-200 hover:bg-emerald-700/50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>

              <Link href="/">
                <Button variant="outline" size="sm" className="bg-emerald-800/50 border-emerald-700 text-emerald-200 hover:bg-emerald-700/50">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-emerald-900/30 border-emerald-700 backdrop-blur-sm h-[700px] flex flex-col">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <ChatInput
                input={input}
                setInput={setInput}
                selectedImage={selectedImage}
                onSendMessage={sendMessage}
                onImageUpload={handleImageUpload}
                onRemoveImage={removeImage}
                isLoading={isLoading}
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <ChatSidebar
            onClearChat={clearChat}
            onExportChat={exportChat}
            sensorData={sensorData}
            currentModel={currentModel ? {
              name: currentModel.name,
              provider: currentModel.provider,
              hasVision: currentModel.hasVision
            } : undefined}
          />
        </div>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="bg-emerald-900 border-emerald-700 text-emerald-100 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-emerald-100">AI Assistant Settings</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="provider" className="w-full">
              <TabsList className="bg-emerald-800 border-emerald-700">
                <TabsTrigger value="provider" className="text-emerald-200">AI Provider</TabsTrigger>
                <TabsTrigger value="model" className="text-emerald-200">Model Selection</TabsTrigger>
                <TabsTrigger value="chat" className="text-emerald-200">Chat Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="provider" className="mt-4">
                <AIProviderSettings />
              </TabsContent>

              <TabsContent value="model" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-emerald-200 font-medium">Select AI Model</h3>
                  <div className="grid gap-2 max-h-60 overflow-y-auto">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          settings.model === model.id
                            ? 'border-emerald-500 bg-emerald-800/50'
                            : 'border-emerald-700 hover:border-emerald-600 bg-emerald-900/30'
                        }`}
                        onClick={() => setSettings(prev => ({ ...prev, model: model.id }))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-emerald-400" />
                            <span className="text-emerald-200 text-sm font-medium">{model.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {model.hasVision && (
                              <Badge variant="secondary" className="bg-purple-900/50 text-purple-300 border-purple-700">
                                <Eye className="h-3 w-3 mr-1" />
                                Vision
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-emerald-300 border-emerald-600">
                              {model.provider}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-emerald-200 font-medium">Chat Preferences</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-emerald-200 text-sm font-medium">Enable Chat History</label>
                        <p className="text-emerald-400 text-xs">Save conversations locally</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableHistory}
                        onChange={(e) => setSettings(prev => ({ ...prev, enableHistory: e.target.checked }))}
                        className="rounded bg-emerald-800 border-emerald-600 text-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-emerald-200 text-sm font-medium">Auto-save Messages</label>
                        <p className="text-emerald-400 text-xs">Automatically save after each message</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoSave}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                        className="rounded bg-emerald-800 border-emerald-600 text-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-emerald-200 text-sm font-medium">System Prompt</label>
                    <Textarea
                      value={settings.systemPrompt}
                      onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className="bg-emerald-800 border-emerald-600 text-emerald-100 placeholder-emerald-500"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}