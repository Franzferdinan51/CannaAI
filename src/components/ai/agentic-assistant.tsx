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
  Brain,
  Calendar,
  BookOpen,
  Target,
  Lightbulb,
  Search,
  Settings,
  TrendingUp
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: any;
  thinking?: string;
  studyPlan?: StudyPlan;
  multiQuiz?: MultiQuiz;
  isSuggestion?: boolean;
}

interface StudyPlan {
  title: string;
  duration: string;
  objectives: string[];
  dailyTopics: { day: number; topic: string; activities: string[] }[];
}

interface MultiQuiz {
  title: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    userAnswerIndex?: number;
  }[];
}

interface PageContext {
  page: string;
  title: string;
  data?: any;
  sensorData?: any;
}

type ChatMode = 'chat' | 'thinking' | 'study-plan' | 'quiz' | 'research' | 'troubleshoot';

interface AgenticAIAssistantProps {
  initialContext?: PageContext;
  className?: string;
}

export default function AgenticAIAssistant({
  initialContext,
  className = ""
}: AgenticAIAssistantProps) {
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
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [showModeSelector, setShowModeSelector] = useState(false);

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

  // Make this function available globally
  useEffect(() => {
    (window as any).updateAgenticAIContext = updateContext;
    return () => {
      delete (window as any).updateAgenticAIContext;
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
        const maxX = window.innerWidth - (window.innerWidth < 640 ? window.innerWidth - 32 : 400);
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          context: context,
          mode: chatMode,
          sensorData: context.sensorData
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date(),
          context: {
            model: data.model,
            provider: data.provider,
            processingTime: data.processingTime
          },
          thinking: data.thinking
        };

        // Handle special modes
        if (chatMode === 'study-plan' && data.studyPlan) {
          assistantMessage.studyPlan = data.studyPlan;
          assistantMessage.content = '';
        } else if (chatMode === 'quiz' && data.quiz) {
          assistantMessage.multiQuiz = data.quiz;
          assistantMessage.content = '';
        }

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
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

  // Generate contextual greeting based on mode
  const getContextualGreeting = () => {
    switch (chatMode) {
      case 'thinking':
        return "🧠 Deep Analysis Mode: I'll provide thorough, well-reasoned cultivation guidance.";
      case 'study-plan':
        return "📅 Growth Plan Creator: Let me create a customized cultivation schedule for you.";
      case 'quiz':
        return "🎯 Knowledge Check: Test your cannabis cultivation expertise!";
      case 'research':
        return "🔬 Research Mode: Deep dive into cultivation science and best practices.";
      case 'troubleshoot':
        return "🔧 Troubleshooting Expert: Diagnose and solve plant health issues.";
      default:
        return "🌱 Hello! I'm your advanced CannaAI assistant. How can I help with your cultivation today?";
    }
  };

  // Get mode icon and color
  const getModeInfo = (mode: ChatMode) => {
    const modeInfo = {
      chat: { icon: <MessageSquare className="h-4 w-4" />, color: 'from-blue-600 to-cyan-600', name: 'Chat' },
      thinking: { icon: <Brain className="h-4 w-4" />, color: 'from-purple-600 to-pink-600', name: 'Deep Analysis' },
      'study-plan': { icon: <Calendar className="h-4 w-4" />, color: 'from-green-600 to-emerald-600', name: 'Growth Plan' },
      quiz: { icon: <Target className="h-4 w-4" />, color: 'from-orange-600 to-red-600', name: 'Quiz' },
      research: { icon: <Search className="h-4 w-4" />, color: 'from-indigo-600 to-blue-600', name: 'Research' },
      troubleshoot: { icon: <Settings className="h-4 w-4" />, color: 'from-slate-600 to-gray-600', name: 'Troubleshoot' }
    };
    return modeInfo[mode] || modeInfo.chat;
  };

  // Handle quiz answers
  const handleQuizAnswer = (messageId: string, questionIndex: number, answerIndex: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.multiQuiz) {
        const newQuestions = [...msg.multiQuiz.questions];
        newQuestions[questionIndex] = { ...newQuestions[questionIndex], userAnswerIndex: answerIndex };
        return { ...msg, multiQuiz: { ...msg.multiQuiz, questions: newQuestions } };
      }
      return msg;
    }));
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

    const modeInfo = getModeInfo(chatMode);

    return (
      <div className="flex items-center justify-between">
        <Badge className={`${contextColors[context.page as keyof typeof contextColors] || 'bg-slate-600'} text-white text-xs`}>
          {contextIcons[context.page as keyof typeof contextIcons] || <Leaf className="h-3 w-3" />}
          <span className="ml-1">{context.title}</span>
        </Badge>
        <Badge className={`${modeInfo.color} text-white text-xs`}>
          {modeInfo.icon}
          <span className="ml-1">{modeInfo.name}</span>
        </Badge>
      </div>
    );
  };

  // Render study plan
  const renderStudyPlan = (plan: StudyPlan) => (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-green-400 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {plan.title}
        </CardTitle>
        <p className="text-xs text-slate-400">Duration: {plan.duration}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Objectives:</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            {plan.objectives.map((obj, idx) => (
              <li key={idx} className="flex items-start">
                <CheckCircle className="h-3 w-3 mr-1 mt-0.5 text-green-400 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Daily Schedule:</h4>
          <div className="space-y-2">
            {plan.dailyTopics.map((day, idx) => (
              <div key={idx} className="bg-slate-700 p-2 rounded">
                <p className="text-xs font-medium text-slate-200">Day {day.day}: {day.topic}</p>
                <ul className="text-xs text-slate-400 mt-1 space-y-1">
                  {day.activities.map((activity, actIdx) => (
                    <li key={actIdx} className="flex items-start">
                      <TrendingUp className="h-3 w-3 mr-1 mt-0.5 text-blue-400 flex-shrink-0" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render quiz
  const renderQuiz = (quiz: MultiQuiz, messageId: string) => (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-orange-400 flex items-center">
          <Target className="h-4 w-4 mr-2" />
          {quiz.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quiz.questions.map((question, qIdx) => (
          <div key={qIdx} className="bg-slate-700 p-3 rounded">
            <p className="text-sm font-medium text-slate-200 mb-2">{question.question}</p>
            <div className="space-y-2">
              {question.options.map((option, oIdx) => {
                const isCorrect = oIdx === question.correctAnswer;
                const isSelected = oIdx === question.userAnswerIndex;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleQuizAnswer(messageId, qIdx, oIdx)}
                    className={`w-full text-left p-2 rounded text-xs transition-colors ${
                      isSelected && isCorrect
                        ? 'bg-green-600 text-white'
                        : isSelected && !isCorrect
                        ? 'bg-red-600 text-white'
                        : isCorrect && question.userAnswerIndex !== undefined
                        ? 'bg-green-800 text-green-200'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                    disabled={question.userAnswerIndex !== undefined}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {question.userAnswerIndex !== undefined && (
              <p className="text-xs text-slate-400 mt-2 italic">{question.explanation}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const modeInfo = getModeInfo(chatMode);

  return (
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
              onClick={() => setIsOpen(true)}
              size="lg"
              className={`bg-gradient-to-r ${modeInfo.color} hover:opacity-90 text-white rounded-full shadow-lg border-2 border-white/20 h-14 w-14 sm:h-auto sm:w-auto sm:px-4`}
              style={{
                position: 'fixed',
                bottom: '20px',
                right: '80px',
                zIndex: 9997
              }}
            >
              <Brain className="h-6 w-6 sm:mr-2" />
              <span className="hidden sm:inline">Agentic AI</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
            </Button>

            {/* Context tooltip */}
            <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-lg whitespace-nowrap">
              {getContextualGreeting()}
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
            className={`bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden ${isMinimized ? 'h-auto' : 'h-[500px] sm:h-[600px]'} w-[calc(100vw-2rem)] sm:w-[350px] md:w-[450px] max-w-[450px]`}
            style={{
              position: 'fixed',
              bottom: isDragging ? `${position.y}px` : '20px',
              right: isDragging ? (position.x > window.innerWidth - 470 ? '20px' : `${position.x}px`) : '80px',
              left: isDragging && position.x <= window.innerWidth - 470 ? `${position.x}px` : 'auto',
              transform: isDragging && position.x <= window.innerWidth - 470 ? 'none' : 'translateX(0)',
              zIndex: 9998
            }}
          >
            {/* Header */}
            <div
              className={`bg-gradient-to-r ${modeInfo.color} text-white p-3 flex items-center justify-between cursor-move touch-none no-select`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span className="font-semibold">Agentic AI Assistant</span>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setShowModeSelector(!showModeSelector)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mode selector */}
            <AnimatePresence>
              {showModeSelector && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-800 border-b border-slate-600 p-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                      chat: 'Chat',
                      thinking: 'Deep Analysis',
                      'study-plan': 'Growth Plan',
                      quiz: 'Quiz',
                      research: 'Research',
                      troubleshoot: 'Troubleshoot'
                    }).map(([mode, name]) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={chatMode === mode ? "default" : "outline"}
                        className={`text-xs ${
                          chatMode === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                        onClick={() => {
                          setChatMode(mode as ChatMode);
                          setShowModeSelector(false);
                        }}
                      >
                        {getModeInfo(mode as ChatMode).icon}
                        <span className="ml-1">{name}</span>
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Context bar */}
            {!isMinimized && (
              <div className="bg-slate-800 px-3 py-2 border-b border-slate-600">
                {renderContextIndicator()}
              </div>
            )}

            {/* Messages area */}
            {!isMinimized && (
              <div className="flex flex-col h-[calc(100%-160px)]">
                <ScrollArea className="flex-1 p-3 scrollbar-chat chat-container" style={{ height: '100%', maxHeight: 'calc(600px - 160px)' }}>
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center text-slate-400 py-8">
                        <Brain className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                        <p className="text-sm font-medium">{getContextualGreeting()}</p>
                        <p className="text-xs mt-1">Choose a mode for specialized assistance!</p>
                      </div>
                    )}

                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%]`}>
                          {message.studyPlan && (
                            <div className="mb-2">
                              {renderStudyPlan(message.studyPlan)}
                            </div>
                          )}
                          {message.multiQuiz && (
                            <div className="mb-2">
                              {renderQuiz(message.multiQuiz, message.id)}
                            </div>
                          )}
                          {message.content && (
                            <div
                              className={`p-3 rounded-lg text-sm ${
                                message.type === 'user'
                                  ? 'bg-blue-600 text-white ml-auto'
                                  : 'bg-slate-700 text-slate-200'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              {message.thinking && (
                                <details className="mt-2 text-xs">
                                  <summary className="cursor-pointer text-purple-400 hover:text-purple-300">
                                    🧠 Thinking Process
                                  </summary>
                                  <div className="mt-1 p-2 bg-slate-800 rounded text-slate-300">
                                    {message.thinking}
                                  </div>
                                </details>
                              )}
                            </div>
                          )}
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
                        <div className="bg-slate-700 text-slate-200 p-3 rounded-lg text-sm max-w-[85%]">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            <span>Thinking deeply...</span>
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
                      placeholder={`Ask about cultivation (${getModeInfo(chatMode).name} mode)...`}
                      className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!input.trim() || isLoading}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-500 text-white"
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
  );
}