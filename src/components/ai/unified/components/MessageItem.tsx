import { Message } from '../types/assistant';
import { Button } from '@/components/ui/button';
import { Bot, ThumbsDown, ThumbsUp, User } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  feedbackMap: Record<string, 'up' | 'down'>;
  onFeedback: (message: Message, type: 'up' | 'down') => void;
}

export const MessageItem = ({ message, feedbackMap, onFeedback }: MessageItemProps) => {
  const isUser = message.type === 'user';
  const feedback = feedbackMap[message.id];

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg p-3 ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
        <div className="flex items-center gap-2 mb-1 text-xs opacity-75">
          {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          <span>{isUser ? 'You' : 'CannaAI'}</span>
        </div>
        {message.image && (
          <img src={message.image} alt="Attached plant image" className="mb-2 max-h-48 rounded object-contain" />
        )}
        {message.content && <p className="whitespace-pre-wrap text-sm">{message.content}</p>}
        {!isUser && (
          <div className="mt-2 flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`h-7 px-2 ${feedback === 'up' ? 'bg-green-600 text-white' : 'text-slate-300'}`}
              onClick={() => onFeedback(message, 'up')}
              disabled={Boolean(feedback)}
              aria-label="Helpful response"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`h-7 px-2 ${feedback === 'down' ? 'bg-red-600 text-white' : 'text-slate-300'}`}
              onClick={() => onFeedback(message, 'down')}
              disabled={Boolean(feedback)}
              aria-label="Unhelpful response"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
