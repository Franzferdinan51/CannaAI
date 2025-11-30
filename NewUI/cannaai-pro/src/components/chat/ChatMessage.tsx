'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  User,
  Copy,
  Share,
  Bookmark,
  Star,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Volume2,
  VolumeX,
  RefreshCw,
  Edit,
  Trash2,
  Check,
  X,
  Info,
  Clock,
  Brain,
  Zap,
  AlertTriangle,
  Leaf,
  FlaskConical,
  Bug,
  Heart,
  TrendingUp,
  Hash,
  MessageSquare,
  BarChart3
} from 'lucide-react';

import { IChatMessage, ChatMessageMetadata } from './types';

interface ChatMessageProps {
  message: IChatMessage;
  isTyping?: boolean;
  isSelected?: boolean;
  onSelect?: (message: IChatMessage) => void;
  onCopy?: (message: IChatMessage) => void;
  onShare?: (message: IChatMessage) => void;
  onBookmark?: (message: IChatMessage) => void;
  onRate?: (messageId: string, rating: 'up' | 'down') => void;
  onFlag?: (messageId: string, reason: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onSpeak?: (text: string) => void;
  onAnalyze?: (messageId: string) => void;
  showMetadata?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function ChatMessage({
  message,
  isTyping = false,
  isSelected = false,
  onSelect,
  onCopy,
  onShare,
  onBookmark,
  onRate,
  onFlag,
  onEdit,
  onDelete,
  onRegenerate,
  onSpeak,
  onAnalyze,
  showMetadata = true,
  showActions = true,
  compact = false,
  className = ''
}: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const messageRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'HIGH': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'MEDIUM': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'LOW': return 'bg-green-500/20 border-green-500/50 text-green-400';
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  };

  const getAnalysisTypeIcon = (type?: string) => {
    switch (type) {
      case 'plant-health': return <Leaf className="w-4 h-4" />;
      case 'nutrient': return <FlaskConical className="w-4 h-4" />;
      case 'pest-disease': return <Bug className="w-4 h-4" />;
      case 'environmental': return <TrendingUp className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.(message);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'CannaAI Chat Message',
        text: message.content
      });
    } else {
      handleCopy();
    }
    onShare?.(message);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(message);
  };

  const handleRate = (newRating: 'up' | 'down') => {
    setRating(newRating);
    setShowRating(false);
    onRate?.(message.id, newRating);
  };

  const handleFlag = (reason: string) => {
    setIsFlagged(true);
    onFlag?.(message.id, reason);
  };

  const handleEdit = () => {
    if (onEdit && editedContent.trim() !== message.content) {
      onEdit(message.id, editedContent);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      onDelete?.(message.id);
    }
  };

  const handleRegenerate = () => {
    onRegenerate?.(message.id);
  };

  const handleSpeak = () => {
    if (onSpeak) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        onSpeak(message.content);
        setIsSpeaking(true);
      }
    }
  };

  const handleAnalyze = () => {
    setShowAnalysis(!showAnalysis);
    onAnalyze?.(message.id);
  };

  const formatMessageContent = (content: string) => {
    // Convert markdown-style formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br />');
  };

  const renderMessageHeader = () => (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${
          message.role === 'user'
            ? 'bg-blue-500 text-white'
            : message.role === 'assistant'
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-500 text-white'
        }`}>
          {message.role === 'user' ? (
            <User className="h-4 w-4" />
          ) : message.role === 'assistant' ? (
            <Bot className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
        </div>
        <span className="text-gray-300 text-sm font-medium">
          {message.role === 'user' ? 'You' :
           message.role === 'assistant' ? 'AI Assistant' : 'System'}
        </span>

        {/* Provider Badge */}
        {message.provider && (
          <Badge className="bg-blue-500/20 border-blue-500/50 text-blue-400 text-xs">
            <Brain className="w-3 h-3 mr-1" />
            {message.provider}
          </Badge>
        )}

        {/* Analysis Type Badge */}
        {message.metadata?.analysisType && (
          <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-400 text-xs">
            {getAnalysisTypeIcon(message.metadata.analysisType)}
            <span className="ml-1 capitalize">
              {message.metadata.analysisType.replace('-', ' ')}
            </span>
          </Badge>
        )}

        {/* Urgency Badge */}
        {message.metadata?.urgency && (
          <Badge className={`text-xs ${getUrgencyColor(message.metadata.urgency)}`}>
            {message.metadata.urgency}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">
          {formatTimestamp(message.timestamp)}
        </span>

        {/* Message Actions */}
        {showActions && !isTyping && (
          <div className="relative" ref={actionsMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="text-gray-400 hover:text-white h-6 w-6 p-0"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>

            <AnimatePresence>
              {showActionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-10 min-w-48"
                >
                  {/* Basic Actions */}
                  <button
                    onClick={handleCopy}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>

                  <button
                    onClick={handleShare}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Share className="w-4 h-4" />
                    Share
                  </button>

                  <button
                    onClick={handleBookmark}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-yellow-400 fill-current' : ''}`} />
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>

                  {/* Voice Actions */}
                  {onSpeak && (
                    <button
                      onClick={handleSpeak}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      {isSpeaking ? 'Stop Speaking' : 'Speak'}
                    </button>
                  )}

                  {/* Rating Actions */}
                  <div className="border-t border-gray-700 my-1" />
                  <button
                    onClick={() => setShowRating(!showRating)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Rate Response
                  </button>

                  <button
                    onClick={() => handleFlag('inappropriate')}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    {isFlagged ? 'Flagged' : 'Flag'}
                  </button>

                  {/* Analysis Actions */}
                  {message.role === 'assistant' && (
                    <>
                      <button
                        onClick={handleAnalyze}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Analyze
                      </button>

                      {onRegenerate && (
                        <button
                          onClick={handleRegenerate}
                          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </button>
                      )}
                    </>
                  )}

                  {/* Edit/Delete Actions (for user messages) */}
                  {message.role === 'user' && (
                    <>
                      <div className="border-t border-gray-700 my-1" />
                      <button
                        onClick={() => setIsEditing(true)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>

                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessageContent = () => {
    if (isTyping) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <span className="text-emerald-300">AI is thinking...</span>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white resize-none"
            rows={4}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEdit} className="bg-emerald-600 hover:bg-emerald-500">
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div
          className="whitespace-pre-wrap text-gray-200"
          dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
        />

        {/* Image Attachment */}
        {message.image && (
          <div className="mt-2">
            <img
              src={message.image}
              alt="Uploaded content"
              className="max-w-full h-auto rounded-lg border border-gray-700"
            />
          </div>
        )}

        {/* Rating UI */}
        <AnimatePresence>
          {showRating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800 rounded-lg p-3 border border-gray-700"
            >
              <p className="text-sm text-gray-300 mb-2">Rate this response:</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={rating === 'up' ? 'default' : 'outline'}
                  onClick={() => handleRate('up')}
                  className={rating === 'up' ? 'bg-green-600 hover:bg-green-500' : 'border-gray-600 text-gray-300'}
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  Helpful
                </Button>
                <Button
                  size="sm"
                  variant={rating === 'down' ? 'default' : 'outline'}
                  onClick={() => handleRate('down')}
                  className={rating === 'down' ? 'bg-red-600 hover:bg-red-500' : 'border-gray-600 text-gray-300'}
                >
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  Not Helpful
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Panel */}
        <AnimatePresence>
          {showAnalysis && message.metadata && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Message Analysis
              </h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {message.metadata.confidence && (
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${message.metadata.confidence}%` }}
                        />
                      </div>
                      <span className="text-gray-300">{message.metadata.confidence}%</span>
                    </div>
                  </div>
                )}

                {message.metadata.healthScore && (
                  <div>
                    <span className="text-gray-500">Health Score:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            message.metadata.healthScore > 70 ? 'bg-green-500' :
                            message.metadata.healthScore > 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${message.metadata.healthScore}%` }}
                        />
                      </div>
                      <span className="text-gray-300">{message.metadata.healthScore}</span>
                    </div>
                  </div>
                )}

                {message.metadata.tokens && (
                  <div>
                    <span className="text-gray-500">Tokens:</span>
                    <span className="text-gray-300 ml-2">{message.metadata.tokens}</span>
                  </div>
                )}

                {message.metadata.analysisType && (
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="text-gray-300 ml-2 capitalize">
                      {message.metadata.analysisType.replace('-', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {message.metadata.strainSpecificAdvice && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <span className="text-gray-500 text-sm">Strain-Specific Advice:</span>
                  <p className="text-gray-300 text-sm mt-1 italic">
                    {message.metadata.strainSpecificAdvice}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Metadata */}
        {showMetadata && !isTyping && (
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-2 mt-3">
            <div className="flex items-center gap-3">
              {message.model && (
                <span className="flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {message.model}
                </span>
              )}

              {message.provider && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {message.provider}
                </span>
              )}

              {message.processingTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {message.processingTime}
                </span>
              )}

              {message.metadata?.tokens && (
                <span>{message.metadata.tokens} tokens</span>
              )}
            </div>

            {/* Expand/Collapse Button */}
            {message.content.length > 500 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show More
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 ${className}`}
      onClick={() => onSelect?.(message)}
    >
      <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
        {renderMessageHeader()}

        <div className={`p-4 rounded-lg border ${
          isSelected ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' :
          message.role === 'user'
            ? 'bg-blue-900/30 border-blue-700/50'
            : message.role === 'assistant'
            ? 'bg-emerald-900/30 border-emerald-700/50'
            : 'bg-gray-800 border-gray-700'
        } ${isBookmarked ? 'ring-2 ring-yellow-500/50' : ''}`}>
          {renderMessageContent()}
        </div>

        {/* Reading progress indicator for long messages */}
        {message.content.length > 1000 && !isExpanded && (
          <div className="text-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-gray-400 hover:text-gray-300 text-xs"
            >
              Continue reading...
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ChatMessage;