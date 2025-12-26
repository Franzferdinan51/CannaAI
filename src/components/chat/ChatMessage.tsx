'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    image?: string;
    model?: string;
    provider?: string;
    processingTime?: string;
    isTyping?: boolean;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-emerald-500 text-white'
          }`}>
            {message.role === 'user' ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
          <span className="text-emerald-300 text-sm font-medium">
            {message.role === 'user' ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-emerald-400 text-xs ml-auto">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        <div className={`p-3 rounded-lg ${
          message.role === 'user'
            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-100'
            : 'bg-emerald-800/50 border border-emerald-600/30 text-emerald-100'
        }`}>
          {message.isTyping ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-emerald-300">Thinking...</span>
            </div>
          ) : (
            <>
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.image && (
                <div className="mt-2">
                  <img
                    src={message.image}
                    alt="Uploaded plant"
                    className="max-w-full h-auto rounded-lg border border-emerald-600/30"
                  />
                </div>
              )}
              {(message.model || message.processingTime) && (
                <div className="mt-2 pt-2 border-t border-emerald-700/50 flex items-center gap-4 text-xs text-emerald-400">
                  {message.model && (
                    <span>Model: {message.model}</span>
                  )}
                  {message.processingTime && (
                    <span>⏱️ {message.processingTime}</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}