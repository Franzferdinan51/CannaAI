'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  Camera,
  Image as ImageIcon,
  FileText,
  Mic,
  MicOff,
  Paperclip,
  X,
  Smile,
  Hash,
  AtSign,
  Bold,
  Italic,
  Link,
  Code,
  List,
  Quote,
  Settings,
  Zap,
  Brain,
  AlertCircle,
  Info,
  ChevronUp,
  Plus,
  Minus
} from 'lucide-react';

import { ChatTemplate, FileAttachment } from './types';

interface ChatInputProps {
  onSend: (content: string, image?: string, attachments?: FileAttachment[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onImageUpload?: (file: File) => void;
  onFileUpload?: (file: File) => void;
  isLoading?: boolean;
  isVoiceEnabled?: boolean;
  isListening?: boolean;
  onVoiceToggle?: () => void;
  templates?: ChatTemplate[];
  onTemplateSelect?: (template: ChatTemplate, variables?: Record<string, any>) => void;
  placeholder?: string;
  maxLength?: number;
  showFormatting?: boolean;
  showTemplates?: boolean;
  className?: string;
}

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  onImageUpload,
  onFileUpload,
  isLoading = false,
  isVoiceEnabled = false,
  isListening = false,
  onVoiceToggle,
  templates = [],
  onTemplateSelect,
  placeholder = 'Type your message...',
  maxLength = 4000,
  showFormatting = true,
  showTemplates = true,
  className = ''
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showFormattingBar, setShowFormattingBar] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [charCount, setCharCount] = useState(0);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const formattingInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Character count
  useEffect(() => {
    setCharCount(input.length);
  }, [input]);

  // Typing indicators
  const handleTyping = useCallback((text: string) => {
    setInput(text);

    if (text.trim()) {
      onTypingStart?.();

      if (typingTimeout) clearTimeout(typingTimeout);
      setTypingTimeout(setTimeout(() => {
        onTypingStop?.();
      }, 1000));
    } else {
      onTypingStop?.();
    }
  }, [onTypingStart, onTypingStop, typingTimeout]);

  // Send message
  const handleSend = useCallback(() => {
    if ((!input.trim() && !selectedImage && attachedFiles.length === 0) || isLoading) return;

    const messageContent = input.trim();
    const attachments: FileAttachment[] = [...attachedFiles];

    if (selectedImage) {
      // Convert base64 image to FileAttachment if needed
      attachments.push({
        id: `image_${Date.now()}`,
        name: 'image.png',
        type: 'image/png',
        size: 0,
        url: selectedImage,
        uploadedAt: new Date(),
        analysis: { isImage: true, analyzed: false }
      });
    }

    onSend(messageContent, selectedImage || undefined, attachments.length > 0 ? attachments : undefined);

    // Reset form
    setInput('');
    setSelectedImage(null);
    setAttachedFiles([]);
    setShowTemplateSelector(false);
    setShowEmojiPicker(false);
    setShowFormattingBar(false);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    onTypingStop?.();

    // Focus back to input
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, [input, selectedImage, attachedFiles, isLoading, onSend, onTypingStop, typingTimeout]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      setShowTemplateSelector(false);
      setShowEmojiPicker(false);
      setShowFormattingBar(false);
    } else if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertFormatting('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('*', '*');
          break;
        case 'k':
          e.preventDefault();
          insertFormatting('[', '](url)');
          break;
        case 'e':
          e.preventDefault();
          insertFormatting('`', '`');
          break;
      }
    }
  }, [handleSend]);

  // Insert formatting
  const insertFormatting = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = input.substring(start, end);
    const newText = input.substring(0, start) + before + selectedText + after + input.substring(end);

    setInput(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (type === 'image') {
        if (file.type.startsWith('image/')) {
          handleImageUpload(file);
        } else {
          alert('Please select an image file');
        }
      } else {
        handleFileUpload(file);
      }
    });
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    onImageUpload?.(file);
  }, [onImageUpload]);

  const handleFileUpload = useCallback((file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      return;
    }

    const attachment: FileAttachment = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: new Date(),
      analysis: {
        isImage: file.type.startsWith('image/'),
        analyzed: false
      }
    };

    setAttachedFiles(prev => [...prev, attachment]);
    onFileUpload?.(file);
  }, [onFileUpload]);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        handleFileUpload(file);
      }
    });
  }, [handleImageUpload, handleFileUpload]);

  // Template handling
  const handleTemplateSelect = useCallback((template: ChatTemplate) => {
    if (template.variables && template.variables.length > 0) {
      // Show template variable input dialog
      const variables: Record<string, any> = {};
      template.variables.forEach(variable => {
        const value = prompt(`Enter ${variable.label}${variable.required ? ' (required)' : ''}:`, String(variable.defaultValue || ''));
        if (value || !variable.required) {
          variables[variable.name] = value || variable.defaultValue;
        }
      });
      onTemplateSelect?.(template, variables);
    } else {
      onTemplateSelect?.(template);
    }
    setShowTemplateSelector(false);
  }, [onTemplateSelect]);

  // Emoji handling
  const emojis = ['😀', '😊', '😍', '🤔', '😎', '👍', '👎', '❤️', '🌱', '🌿', '🍃', '🔥', '💧', '☀️', '🌡️', '🌡️', '⚡', '🚀', '✅', '❌', '⚠️', 'ℹ️', '🎯', '💡', '🔬', '🧪', '📊', '📈', '💰', '⏰', '🔔'];

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = input.substring(0, start) + emoji + input.substring(start);

    setInput(newText);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }, [input]);

  return (
    <div className={`border-t border-gray-700 bg-gray-900 ${className}`}>
      {/* Attachments Preview */}
      <AnimatePresence>
        {(selectedImage || attachedFiles.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 border-b border-gray-800"
          >
            <div className="space-y-2">
              {selectedImage && (
                <div className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">Image ready for analysis</p>
                    <p className="text-xs text-gray-500">AI will analyze this image</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={removeImage}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {attachedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                  <div className="p-2 bg-gray-700 rounded">
                    {file.analysis?.isImage ? (
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(file.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formatting Bar */}
      <AnimatePresence>
        {showFormattingBar && showFormatting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-800 p-2"
          >
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => insertFormatting('**', '**')} className="text-gray-400 hover:text-white">
                <Bold className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => insertFormatting('*', '*')} className="text-gray-400 hover:text-white">
                <Italic className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => insertFormatting('`', '`')} className="text-gray-400 hover:text-white">
                <Code className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => insertFormatting('[', '](url)')} className="text-gray-400 hover:text-white">
                <Link className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-gray-700 mx-1" />
              <Button size="sm" variant="ghost" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-400 hover:text-white">
                <Smile className="w-4 h-4" />
              </Button>
              {showTemplates && templates.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setShowTemplateSelector(!showTemplateSelector)} className="text-gray-400 hover:text-white">
                  <Hash className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Selector */}
      <AnimatePresence>
        {showTemplateSelector && showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-800 p-3"
          >
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Quick templates:</p>
              <div className="grid grid-cols-2 gap-2">
                {templates.slice(0, 6).map(template => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateSelect(template)}
                    className="justify-start border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    {template.icon && <span className="mr-2">{template.icon}</span>}
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-800 p-3"
          >
            <div className="grid grid-cols-10 gap-1">
              {emojis.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => insertEmoji(emoji)}
                  className="text-lg hover:bg-gray-800"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-end gap-3 p-4">
          {/* File inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e, 'image')}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e, 'file')}
            className="hidden"
          />

          {/* Left side actions */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => imageInputRef.current?.click()}
              className="text-gray-400 hover:text-white"
              title="Upload image"
            >
              <Camera className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-white"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {showFormatting && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFormattingBar(!showFormattingBar)}
                className={`text-gray-400 hover:text-white ${showFormattingBar ? 'text-white' : ''}`}
                title="Formatting options"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Text area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[60px] max-h-[200px]"
              disabled={isLoading}
              maxLength={maxLength}
            />

            {/* Character count */}
            {charCount > maxLength * 0.8 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {charCount}/{maxLength}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Voice toggle */}
            {isVoiceEnabled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onVoiceToggle}
                className={`${
                  isListening ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedImage && attachedFiles.length === 0)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-500 border-dashed rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-emerald-400 mb-2">
                <Paperclip className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-emerald-300 font-medium">Drop files here</p>
              <p className="text-emerald-400 text-sm">Images and documents supported</p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            {input.trim() ? 'Press Enter to send, Shift+Enter for new line' : 'Start typing or drag files here'}
          </span>

          {isListening && (
            <span className="flex items-center gap-1 text-red-400">
              <Mic className="w-3 h-3" />
              Recording...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {attachedFiles.length > 0 && (
            <span>{attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''} attached</span>
          )}

          {selectedImage && (
            <span>1 image attached</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatInput;