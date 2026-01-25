'use client';

import React, { useRef } from 'react';
import { Send, Loader2, Camera, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

export function ChatInput({
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleImageUpload = (file: File) => {
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      if (file.size > 20 * 1024 * 1024) {
        alert('Image size must be less than 20MB');
        return;
      }
      onImageUpload(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="border-t border-emerald-700/50 p-4">
      {selectedImage && (
        <div className="mb-3 p-2 bg-emerald-800/30 rounded-lg border border-emerald-600/30">
          <div className="flex items-center gap-2">
            <img
              src={selectedImage}
              alt="Selected"
              className="w-12 h-12 object-cover rounded"
            />
            <span className="text-emerald-300 text-sm flex-1">Image ready for analysis</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemoveImage}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragging
            ? 'border-emerald-400 bg-emerald-400/10'
            : 'border-emerald-600/30 hover:border-emerald-500/50'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-800/50 border-emerald-600/50 text-emerald-300 hover:bg-emerald-700/50"
            disabled={isLoading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Image
          </Button>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything about cannabis cultivation... (Shift+Enter for new line)"
            className="flex-1 bg-emerald-800/30 border-emerald-600/50 text-emerald-100 placeholder-emerald-500 resize-none h-12 min-h-12 max-h-32"
            disabled={isLoading}
            aria-label="Type your message"
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  onClick={onSendMessage}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send message</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
          <Info className="h-3 w-3" />
          <span>Drag & drop images here • Max 20MB • JPG, PNG, WebP, HEIC, HEIF supported</span>
        </div>
      </div>
    </div>
  );
}