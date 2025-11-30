import { useState, useRef, useCallback } from 'react';
import { Message, ChatMode, PageContext, PageSnapshot, PlantContext, AgenticContext, EnvironmentalData, AgenticTrigger } from '../types/assistant';

export const useAssistantChat = (
  context: PageContext,
  plantContext: PlantContext,
  agenticContext: AgenticContext,
  environmentalHistory: EnvironmentalData[],
  autonomousActions: any[],
  agenticTriggers: AgenticTrigger[],
  agenticEnabled: boolean,
  chatMode: ChatMode
) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [input, isLoading]);

  // Send message to AI
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    let latestMessages: Message[] = [];

    // This will be set by the parent component
    const setMessages = (callback: (prev: Message[]) => Message[]) => {
      const result = callback([]); // Placeholder - will be replaced by parent
      return result;
    };

    setMessages(prev => {
      const next = [...prev, userMessage];
      latestMessages = next;
      return next;
    });

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
          context: {
            ...context,
            plantContext,
            agenticContext,
            environmentalHistory,
            autonomousActions: autonomousActions.slice(-5)
          },
          mode: chatMode,
          sensorData: context.sensorData,
          pageSnapshot: {
            url: typeof window !== 'undefined' ? window.location.href : '',
            title: typeof document !== 'undefined' ? document.title : '',
            scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
            viewport: {
              width: typeof window !== 'undefined' ? window.innerWidth : 0,
              height: typeof window !== 'undefined' ? window.innerHeight : 0
            },
            timestamp: Date.now()
          },
          agenticData: {
            triggers: agenticTriggers,
            userPreferences: agenticContext.userPreferences,
            systemCapabilities: agenticContext.systemCapabilities
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: ['autonomous', 'proactive', 'predictive', 'monitor'].includes(chatMode) ? 'agentic' : 'assistant',
          content: data.response,
          timestamp: new Date(),
          context: {
            model: data.model,
            provider: data.provider,
            processingTime: data.processingTime
          },
          thinking: data.thinking,
          messageType: data.messageType || 'general',
          confidence: data.confidence,
          urgency: data.urgency
        };

        // Handle special modes
        if (chatMode === 'study-plan' && data.studyPlan) {
          assistantMessage.studyPlan = data.studyPlan;
          assistantMessage.content = '';
        } else if (chatMode === 'quiz' && data.quiz) {
          assistantMessage.multiQuiz = data.quiz;
          assistantMessage.content = '';
        } else if (data.actionPlan) {
          assistantMessage.actionPlan = data.actionPlan;
          assistantMessage.content = data.response || '';
        } else if (data.patternAnalysis) {
          assistantMessage.patternAnalysis = data.patternAnalysis;
          assistantMessage.content = data.response || '';
        }

        setMessages(prev => {
          const next = [...prev, assistantMessage];
          latestMessages = next;
          return next;
        });
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        messageType: 'alert',
        urgency: 'medium'
      };

      setMessages(prev => {
        const next = [...prev, errorMessage];
        latestMessages = next;
        return next;
      });
    } finally {
      setIsLoading(false);
    }

    return latestMessages;
  }, [input, isLoading, context, plantContext, agenticContext, environmentalHistory, autonomousActions, agenticTriggers, chatMode]);

  // Trigger image upload
  const triggerImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    input,
    setInput,
    isLoading,
    setIsLoading,
    inputRef,
    fileInputRef,
    handleKeyPress,
    sendMessage,
    triggerImageUpload
  };
};
