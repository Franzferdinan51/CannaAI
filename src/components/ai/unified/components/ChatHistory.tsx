import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Star, X } from 'lucide-react';
import { ChatHistory as ChatHistoryType } from '../types/assistant';

interface ChatHistoryProps {
  chatHistory: ChatHistoryType[];
  currentChatId: string | null;
  onCloseHistory: () => void;
  onLoadChat: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export const ChatHistory = ({
  chatHistory,
  currentChatId,
  onCloseHistory,
  onLoadChat,
  onTogglePin,
  onDeleteChat
}: ChatHistoryProps) => {
  return (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-purple-400 flex items-center">
            <History className="h-4 w-4 mr-2" />
            Chat History
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 h-6 w-6 p-0"
            onClick={onCloseHistory}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="text-center text-slate-400 py-4">
              <History className="h-8 w-8 mx-auto mb-2 text-slate-500" />
              <p className="text-xs">No chat history yet</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`p-2 bg-slate-700 rounded cursor-pointer hover:bg-slate-600 transition-colors ${
                  currentChatId === chat.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0" onClick={() => onLoadChat(chat.id)}>
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs bg-slate-600 text-slate-200">
                        {chat.category}
                      </Badge>
                      {chat.isPinned && <Star className="h-3 w-3 text-yellow-400 fill-current" />}
                    </div>
                    <p className="text-xs text-slate-200 font-medium truncate mt-1">{chat.title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {chat.timestamp.toLocaleDateString()} • {chat.messages.length} messages
                    </p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-yellow-400 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(chat.id);
                      }}
                    >
                      <Star className="h-3 w-3 fill-current" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
