'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  User,
  Send,
  Loader2,
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  FileText,
  Trash2,
  Download,
  Settings,
  Search,
  Plus,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Brain,
  Zap,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  MessageSquare,
  Hash,
  Star,
  Archive,
  RefreshCw,
  Copy,
  Share,
  Bookmark,
  Filter,
  SlidersHorizontal
} from 'lucide-react';

import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSidebar } from './ChatSidebar';
import { ChatTemplates } from './ChatTemplates';
import { ChatAnalytics } from './ChatAnalytics';
import { VoiceChat } from './VoiceChat';
import { ConversationManager } from './ConversationManager';
import { ChatSettings } from './ChatSettings';
import { useChat } from '../../hooks/useChat';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDebounce } from '../../hooks/useDebounce';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useWebSocket } from '../../hooks/useWebSocket';

import {
  ChatMessage as IChatMessage,
  ChatConversation,
  ChatTemplate,
  ChatSettings as IChatSettings,
  ChatAnalytics as IChatAnalytics,
  QuickResponse,
  FileAttachment,
  VoiceChatSettings,
  ChatNotification
} from './types';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'react-hot-toast';

interface ChatInterfaceProps {
  initialConversation?: string;
  sensorData?: any;
  className?: string;
  onSettingsChange?: (settings: IChatSettings) => void;
  onAnalyticsUpdate?: (analytics: IChatAnalytics) => void;
}

export function ChatInterface({
  initialConversation,
  sensorData = {},
  className = '',
  onSettingsChange,
  onAnalyticsUpdate
}: ChatInterfaceProps) {
  // Core chat state
  const {
    messages,
    conversations,
    currentConversation,
    isLoading,
    isConnected,
    currentProvider,
    activeTemplates,
    quickResponses,
    analytics,
    notifications,
    settings,

    // Actions
    sendMessage,
    updateMessage,
    deleteMessage,
    createConversation,
    switchConversation,
    deleteConversation,
    archiveConversation,
    starConversation,
    updateSettings,
    clearChat,
    exportChat,
    importChat,

    // AI Provider management
    testProvider,
    switchProvider,
    getProviderStatus
  } = useChat({ initialConversation, sensorData });

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConversationManager, setShowConversationManager] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [filteredMessages, setFilteredMessages] = useState(messages);
  const [selectedMessage, setSelectedMessage] = useState<IChatMessage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Voice features
  const {
    isListening: isVoiceListening,
    transcript: voiceTranscript,
    startListening,
    stopListening,
    isSupported: voiceSupported
  } = useVoiceRecognition({
    onResult: (text) => {
      // Handle voice input
    },
    onError: (error) => {
      toast.error(`Voice recognition error: ${error}`);
    }
  });

  const {
    isSpeaking: voiceSpeaking,
    speak,
    stopSpeaking,
    isSupported: speechSupported
  } = useSpeechSynthesis({
    voice: settings?.features?.enableVoiceOutput ? settings?.ui?.language || 'en-US' : undefined,
    rate: 1.0,
    pitch: 1.0
  });

  // WebSocket for real-time updates
  const {
    socket,
    isConnected: wsConnected,
    send: wsSend,
    lastMessage
  } = useWebSocket('/api/chat/ws', {
    onConnect: () => {
      console.log('Chat WebSocket connected');
    },
    onDisconnect: () => {
      console.log('Chat WebSocket disconnected');
    },
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const filtered = messages.filter(msg =>
      msg.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
      msg.role.toLowerCase().includes(messageSearch.toLowerCase())
    );
    setFilteredMessages(filtered);
  }, [messages, messageSearch]);

  useEffect(() => {
    if (onAnalyticsUpdate && analytics) {
      onAnalyticsUpdate(analytics);
    }
  }, [analytics, onAnalyticsUpdate]);

  useKeyboardShortcuts([
    { key: 'ctrl+/', handler: () => setShowTemplates(!showTemplates) },
    { key: 'ctrl+k', handler: () => setMessageSearch('') },
    { key: 'ctrl+n', handler: () => createNewConversation() },
    { key: 'ctrl+shift+s', handler: () => setShowSettings(!showSettings) },
    { key: 'ctrl+shift+a', handler: () => setShowAnalytics(!showAnalytics) },
    { key: 'escape', handler: () => {
      setShowTemplates(false);
      setShowSettings(false);
      setShowAnalytics(false);
      setShowConversationManager(false);
      setSelectedMessage(null);
    }}
  ]);

  // Debounced search
  const debouncedSearch = useDebounce((searchTerm: string) => {
    setMessageSearch(searchTerm);
  }, 300);

  // Memoized values
  const unreadNotifications = useMemo(() =>
    notifications.filter(n => !n.read).length,
    [notifications]
  );

  const starredConversations = useMemo(() =>
    conversations.filter(c => c.isStarred),
    [conversations]
  );

  const recentConversations = useMemo(() =>
    conversations
      .filter(c => !c.isArchived)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5),
    [conversations]
  );

  // Handlers
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, image?: string, attachments?: FileAttachment[]) => {
    if (!content.trim() && !image && !attachments?.length) return;

    setIsTyping(false);
    if (typingTimeout) clearTimeout(typingTimeout);

    await sendMessage(content, image, attachments);

    if (settings?.features?.enableVoiceOutput && speechSupported) {
      // Speak the response when it arrives
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      wsSend?.({ type: 'typing_started', conversationId: currentConversation?.id });
    }

    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => {
      setIsTyping(false);
      wsSend?.({ type: 'typing_stopped', conversationId: currentConversation?.id });
    }, 1000));
  };

  const handleTemplateSelect = (template: ChatTemplate, variables?: Record<string, any>) => {
    let prompt = template.prompt;

    if (template.variables && variables) {
      template.variables.forEach(variable => {
        const value = variables[variable.name];
        if (value !== undefined) {
          prompt = prompt.replace(`{${variable.name}}`, String(value));
        }
      });
    }

    handleSendMessage(prompt);
  };

  const handleQuickResponse = (response: QuickResponse) => {
    handleSendMessage(response.text);
  };

  const handleVoiceToggle = () => {
    if (isVoiceListening) {
      stopListening();
    } else if (voiceSupported) {
      startListening();
    } else {
      toast.error('Voice recognition is not supported in your browser');
    }
  };

  const handleExportChat = (format: 'json' | 'txt' | 'csv' = 'json') => {
    exportChat(format, currentConversation?.id);
  };

  const handleImportChat = (file: File) => {
    importChat(file);
  };

  const createNewConversation = () => {
    const newConversation = createConversation('New Chat');
    if (newConversation) {
      switchConversation(newConversation.id);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'message_received':
        // Handle incoming real-time message
        break;
      case 'provider_status_changed':
        // Handle provider status update
        break;
      case 'notification':
        // Handle new notification
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const handleCopyMessage = (message: IChatMessage) => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message copied to clipboard');
  };

  const handleShareMessage = (message: IChatMessage) => {
    if (navigator.share) {
      navigator.share({
        title: 'CannaAI Chat Message',
        text: message.content
      });
    } else {
      handleCopyMessage(message);
    }
  };

  const handleBookmarkMessage = (message: IChatMessage) => {
    // Implement bookmark functionality
    toast.success('Message bookmarked');
  };

  // Render functions
  const renderHeader = () => (
    <div className="border-b border-gray-700 bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-semibold text-white">
              {currentConversation?.title || 'AI Cultivation Assistant'}
            </h1>
            {currentConversation?.isStarred && (
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={`${
                isConnected ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                'bg-red-500/20 border-red-500/50 text-red-400'
              }`}
            >
              {isConnected ? (
                <><Wifi className="w-3 h-3 mr-1" />Connected</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" />Offline</>
              )}
            </Badge>

            {currentProvider && (
              <Badge variant="outline" className="bg-blue-500/20 border-blue-500/50 text-blue-400">
                <Brain className="w-3 h-3 mr-1" />
                {currentProvider}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={messageSearch}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white w-64"
            />
          </div>

          {/* Voice Toggle */}
          {settings?.features?.enableVoiceInput && voiceSupported && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleVoiceToggle}
                    className={`${
                      isVoiceListening ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isVoiceListening ? 'Stop voice input' : 'Start voice input'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Templates */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-gray-400 hover:text-white"
                >
                  <Hash className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Quick Templates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Notifications */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white relative"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{unreadNotifications} notifications</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700">
              <DropdownMenuItem onClick={() => setShowConversationManager(true)} className="text-gray-200">
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAnalytics(true)} className="text-gray-200">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem onClick={() => handleExportChat('json')} className="text-gray-200">
                <Download className="w-4 h-4 mr-2" />
                Export Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearChat} className="text-gray-200">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Chat
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem onClick={() => setShowSettings(true)} className="text-gray-200">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  const renderMessages = () => (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4 max-w-4xl mx-auto">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Welcome to CannaAI Chat
            </h3>
            <p className="text-gray-500 mb-6">
              Your AI-powered cultivation assistant is ready to help
            </p>

            {activeTemplates.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Quick start with a template:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {activeTemplates.slice(0, 3).map(template => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          filteredMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onCopy={handleCopyMessage}
              onShare={handleShareMessage}
              onBookmark={handleBookmarkMessage}
              onSelect={setSelectedMessage}
              isSelected={selectedMessage?.id === message.id}
              onSpeak={settings?.features?.enableVoiceOutput ? speak : undefined}
            />
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span className="text-gray-300">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );

  return (
    <div className={`flex h-screen bg-gray-900 ${className}`}>
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 320 }}
            exit={{ width: 0 }}
            className="bg-gray-800 border-r border-gray-700"
          >
            <ChatSidebar
              conversations={conversations}
              currentConversationId={currentConversation?.id}
              recentConversations={recentConversations}
              starredConversations={starredConversations}
              quickResponses={quickResponses}
              onConversationSelect={switchConversation}
              onNewConversation={createNewConversation}
              onQuickResponse={handleQuickResponse}
              onArchive={(id) => archiveConversation(id)}
              onDelete={(id) => deleteConversation(id)}
              onStar={(id) => starConversation(id)}
              analytics={analytics}
              settings={settings}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {renderHeader()}
        {renderMessages()}

        <ChatInput
          onSend={handleSendMessage}
          onTypingStart={handleTypingStart}
          onImageUpload={settings?.features?.enableImageAnalysis ? (file) => {
            // Handle image upload
          } : undefined}
          onFileUpload={settings?.features?.enableFileSharing ? (file) => {
            // Handle file upload
          } : undefined}
          isLoading={isLoading}
          isVoiceEnabled={settings?.features?.enableVoiceInput}
          isListening={isVoiceListening}
          onVoiceToggle={handleVoiceToggle}
          templates={activeTemplates}
          onTemplateSelect={handleTemplateSelect}
          placeholder="Ask me anything about cannabis cultivation..."
          className="border-t border-gray-700 bg-gray-900 p-4"
        />
      </div>

      {/* Templates Panel */}
      <AnimatePresence>
        {showTemplates && (
          <ChatTemplates
            templates={activeTemplates}
            onTemplateSelect={handleTemplateSelect}
            onClose={() => setShowTemplates(false)}
            className="fixed right-4 top-20 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl"
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Chat Settings</DialogTitle>
          </DialogHeader>
          <ChatSettings
            settings={settings}
            onSettingsChange={updateSettings}
            onSettingsChangeComplete={(newSettings) => {
              setShowSettings(false);
              onSettingsChange?.(newSettings);
              toast.success('Settings saved successfully');
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Analytics Modal */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Chat Analytics</DialogTitle>
          </DialogHeader>
          <ChatAnalytics
            analytics={analytics}
            conversations={conversations}
            messages={messages}
            onClose={() => setShowAnalytics(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Conversation Manager Modal */}
      <Dialog open={showConversationManager} onOpenChange={setShowConversationManager}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Conversation Manager</DialogTitle>
          </DialogHeader>
          <ConversationManager
            conversations={conversations}
            currentConversationId={currentConversation?.id}
            onConversationSelect={switchConversation}
            onConversationDelete={deleteConversation}
            onConversationArchive={archiveConversation}
            onConversationStar={starConversation}
            onImportChat={handleImportChat}
            onExportChat={handleExportChat}
            onClose={() => setShowConversationManager(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChatInterface;
