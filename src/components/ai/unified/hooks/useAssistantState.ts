import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, PageContext, PageSnapshot } from '../types/assistant';

export const useAssistantState = (initialContext?: PageContext) => {
  // Core UI state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<PageContext>(
    initialContext || {
      page: 'unknown',
      title: 'CannaAI Pro'
    }
  );

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        const inputRef = document.querySelector('input[placeholder*="Ask about cultivation"]') as HTMLInputElement;
        inputRef?.focus();
      }, 300);
    }
  }, [isOpen, isMinimized]);

  // Update context based on current page
  const updateContext = useCallback((newContext: PageContext) => {
    setContext(newContext);
  }, []);

  // Make this function available globally
  useEffect(() => {
    (window as any).updateAIContext = updateContext;
    return () => {
      delete (window as any).updateAIContext;
    };
  }, [updateContext]);

  return {
    // State
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    messages,
    setMessages,
    context,
    updateContext,

    // Refs
    messagesEndRef
  };
};
