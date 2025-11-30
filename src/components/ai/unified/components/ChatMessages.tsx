import { Message } from '../types/assistant';
import { MessageItem } from './MessageItem';

interface ChatMessagesProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  feedbackMap: Record<string, 'up' | 'down'>;
  onFeedback: (message: Message, type: 'up' | 'down') => void;
  isLoading: boolean;
}

export const ChatMessages = ({
  messages,
  messagesEndRef,
  feedbackMap,
  onFeedback,
  isLoading
}: ChatMessagesProps) => {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          feedbackMap={feedbackMap}
          onFeedback={onFeedback}
        />
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-slate-700 text-slate-200 rounded-lg p-3 max-w-[80%]">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
