'use client';

import React, { ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Eye,
  Leaf,
  Calculator,
  Beaker,
  Bug,
  Settings,
  Plus,
  Star,
  Archive,
  Package,
  TrendingUp,
  BookOpen,
  Wrench,
  Menu,
  X
} from 'lucide-react';

export type ViewMode = 'chat' | 'live-vision' | 'plant-health' | 'nutrients' | 'genetics' | 'pest-disease' | 'tools' | 'settings';
export type ChatMode = 'chat' | 'analysis' | 'diagnosis' | 'recommendation' | 'trichome' | 'harvest';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp?: string;
  isSuggestion?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  onClose: () => void;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  isLoading: boolean;
  chatHistory: Record<string, Message[]>;
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  pinnedChatIds: string[];
  onTogglePin: (chatId: string) => void;
}

const mainTools = [
  { view: 'chat' as ViewMode, label: 'AI Assistant', icon: <MessageCircle className="h-5 w-5" /> },
  { view: 'live-vision' as ViewMode, label: 'Live Vision', icon: <Eye className="h-5 w-5" /> },
  { view: 'plant-health' as ViewMode, label: 'Plant Health', icon: <Leaf className="h-5 w-5" /> },
  { view: 'tools' as ViewMode, label: 'All Tools', icon: <Wrench className="h-5 w-5" /> },
];

const assistantModes: { mode: ChatMode; label: string; icon: ReactElement; description: string }[] = [
  { mode: 'analysis', label: 'Plant Analysis', icon: <Bug className="h-5 w-5" />, description: 'Analyze plant health and issues' },
  { mode: 'diagnosis', label: 'Problem Diagnosis', icon: <Settings className="h-5 w-5" />, description: 'Diagnose cultivation problems' },
  { mode: 'recommendation', label: 'Growing Advice', icon: <TrendingUp className="h-5 w-5" />, description: 'Get cultivation recommendations' },
  { mode: 'trichome', label: 'Trichome Analysis', icon: <Beaker className="h-5 w-5" />, description: 'Analyze trichome development' },
  { mode: 'harvest', label: 'Harvest Planning', icon: <Package className="h-5 w-5" />, description: 'Optimize harvest timing' },
];

const CannaAISidebar: React.FC<SidebarProps> = ({
  isOpen, activeView, setActiveView, onClose,
  chatMode, setChatMode, isLoading,
  chatHistory, activeChatId, onNewChat, onSelectChat,
  pinnedChatIds, onTogglePin
}) => {
  const handleItemClick = (view: ViewMode) => {
    setActiveView(view);
    if (view === 'chat') {
      setChatMode('chat');
    }
    if (window.innerWidth < 768) onClose();
  };

  const handleAssistantClick = (mode: ChatMode) => {
    setChatMode(mode);
    setActiveView('chat');
    if (window.innerWidth < 768) onClose();
  };

  const handleActionClick = (action: () => void) => {
    action();
    if (window.innerWidth < 768) onClose();
  };

  const handleChatSelect = (chatId: string) => {
    onSelectChat(chatId);
    setActiveView('chat');
    if (window.innerWidth < 768) onClose();
  };

  const getChatTitle = (messages: Message[]): string => {
    if (messages.length <= 1) return "New Consultation";
    const userMessage = messages.find(m => m.sender === 'user');
    if (!userMessage || !userMessage.text) return "New Consultation";
    return userMessage.text.substring(0, 30) + (userMessage.text.length > 30 ? '...' : '');
  };

  const getChatCategory = (messages: Message[]): string => {
    if (messages.length <= 1) return "General";
    const userMessage = messages.find(m => m.sender === 'user');
    if (!userMessage || !userMessage.text) return "General";

    const text = userMessage.text.toLowerCase();
    if (text.includes('trichome') || text.includes('harvest')) return "Harvest";
    if (text.includes('nutrient') || text.includes('feeding')) return "Nutrients";
    if (text.includes('pest') || text.includes('disease')) return "Health";
    if (text.includes('strain') || text.includes('genetic')) return "Genetics";
    return "General";
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Harvest': return 'bg-orange-500/20 text-orange-400';
      case 'Nutrients': return 'bg-green-500/20 text-green-400';
      case 'Health': return 'bg-red-500/20 text-red-400';
      case 'Genetics': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  const chatHistoryItems = Object.keys(chatHistory).reverse();
  const pinnedChats = chatHistoryItems.filter(id => pinnedChatIds.includes(id));
  const recentChats = chatHistoryItems.filter(id => !pinnedChatIds.includes(id));

  const renderChatItem = (chatId: string) => {
    const messages = chatHistory[chatId] || [];
    const category = getChatCategory(messages);

    return (
      <li key={chatId} className="group relative">
        <button
          onClick={() => handleChatSelect(chatId)}
          className={`w-full text-left text-sm p-2 rounded truncate transition-colors pr-8 ${
            chatId === activeChatId && activeView === 'chat'
              ? 'bg-blue-600/30 text-white border border-blue-500/50'
              : 'text-gray-400 hover:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="truncate flex-1">{getChatTitle(messages)}</span>
            <Badge className={`text-xs ${getCategoryColor(category)} border-0`}>
              {category}
            </Badge>
          </div>
        </button>
        <button
          onClick={() => onTogglePin(chatId)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-colors"
          title={pinnedChatIds.includes(chatId) ? "Unpin consultation" : "Pin consultation"}
        >
          <Star className={`w-4 h-4 ${pinnedChatIds.includes(chatId) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>
      </li>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-900/95 backdrop-blur-lg border-r border-slate-700 w-72 z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">CannaAI Pro</h2>
              <p className="text-xs text-slate-400">Cultivation Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 hover:scrollbar-thumb-slate-500">
          <nav className="p-4 space-y-6">
            {/* Main Tools */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Main Tools</h3>
              <div className="space-y-1">
                {mainTools.map(item => {
                  const isActive = activeView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => handleItemClick(item.view)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25'
                          : 'text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Assistants */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Assistants</h3>
              <div className="space-y-2">
                {assistantModes.map(item => (
                  <div key={item.mode} className="group">
                    <button
                      onClick={() => handleAssistantClick(item.mode)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                        activeView === 'chat' && chatMode === item.mode
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                          : 'text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        activeView === 'chat' && chatMode === item.mode
                          ? 'bg-white/20'
                          : 'bg-slate-600/50'
                      }`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className={`text-xs ${
                          activeView === 'chat' && chatMode === item.mode
                            ? 'text-white/80'
                            : 'text-slate-400'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinned Chats */}
            {pinnedChats.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pinned</h3>
                  <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">
                    {pinnedChats.length}
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {pinnedChats.map(renderChatItem)}
                </ul>
              </div>
            )}

            {/* Recent Chats */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent</h3>
                <button
                  onClick={() => handleActionClick(onNewChat)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors"
                  title="New Consultation"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <ul className="space-y-1">
                {recentChats.slice(0, 5).map(renderChatItem)}
              </ul>
            </div>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <Button
            onClick={() => handleActionClick(() => setActiveView('settings'))}
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </aside>
    </>
  );
};

export default CannaAISidebar;