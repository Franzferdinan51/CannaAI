'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Search,
  Star,
  Archive,
  Trash2,
  Clock,
  Hash,
  Bot,
  TrendingUp,
  BarChart3,
  Settings,
  Filter,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  Brain,
  Leaf,
  Droplets,
  Thermometer,
  Sun,
  Moon,
  Calendar,
  Tag,
  MoreVertical,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

import {
  ChatConversation,
  QuickResponse,
  ChatAnalytics,
  ChatSettings,
  SensorData
} from './types';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  currentConversationId?: string;
  recentConversations: ChatConversation[];
  starredConversations: ChatConversation[];
  quickResponses: QuickResponse[];
  analytics?: ChatAnalytics;
  settings?: ChatSettings;
  sensorData?: SensorData;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  onQuickResponse: (response: QuickResponse) => void;
  onArchive: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onStar: (conversationId: string) => void;
  onExport?: (format: 'json' | 'csv' | 'txt') => void;
  onImport?: (file: File) => void;
  onSettingsClick?: () => void;
  onAnalyticsClick?: () => void;
  className?: string;
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  recentConversations,
  starredConversations,
  quickResponses,
  analytics,
  settings,
  sensorData = {
    temperature: 22,
    humidity: 55,
    ph: 6.2,
    soilMoisture: 65,
    lightIntensity: 750,
    ec: 1.4,
    co2: 1200,
    vpd: 0.85
  },
  onConversationSelect,
  onNewConversation,
  onQuickResponse,
  onArchive,
  onDelete,
  onStar,
  onExport,
  onImport,
  onSettingsClick,
  onAnalyticsClick,
  className = ''
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'starred' | 'recent' | 'archived'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Filter conversations based on search and filters
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Tab filtering
    switch (activeTab) {
      case 'starred':
        filtered = filtered.filter(c => c.isStarred && !c.isArchived);
        break;
      case 'recent':
        filtered = recentConversations.filter(c => !c.isArchived);
        break;
      case 'archived':
        filtered = filtered.filter(c => c.isArchived);
        break;
      default:
        filtered = filtered.filter(c => !c.isArchived);
    }

    // Search filtering
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Tag filtering
    if (filterTags.length > 0) {
      filtered = filtered.filter(c =>
        filterTags.some(tag => c.tags?.includes(tag))
      );
    }

    // Date filtering
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(c => new Date(c.updatedAt) >= filterDate);
    }

    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [conversations, searchQuery, activeTab, filterTags, dateFilter, recentConversations]);

  // Get all unique tags from conversations
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    conversations.forEach(c => c.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [conversations]);

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get conversation preview
  const getConversationPreview = (conversation: ChatConversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage) return 'No messages';

    const preview = lastMessage.content.substring(0, 50);
    return lastMessage.content.length > 50 ? preview + '...' : preview;
  };

  // Handle conversation actions
  const handleConversationAction = (action: string, conversationId: string) => {
    switch (action) {
      case 'star':
        onStar(conversationId);
        break;
      case 'archive':
        onArchive(conversationId);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this conversation?')) {
          onDelete(conversationId);
        }
        break;
      default:
        break;
    }
    setSelectedConversation(null);
  };

  return (
    <div className={`w-80 bg-gray-800 border-r border-gray-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Conversations
          </h2>
          <div className="flex items-center gap-1">
            {onImport && (
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json,.csv,.txt';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) onImport(file);
                  };
                  input.click();
                }}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                title="Import conversations"
              >
                <Upload className="w-4 h-4" />
              </button>
            )}
            {onExport && (
              <button
                onClick={() => onExport('json')}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                title="Export conversations"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* New conversation button */}
        <Button
          onClick={onNewConversation}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <Filter className="w-3 h-3" />
              Filters
              {(filterTags.length > 0 || dateFilter !== 'all') && (
                <span className="bg-emerald-500 text-white text-xs px-1 rounded">
                  {filterTags.length + (dateFilter !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {onAnalyticsClick && analytics && (
            <button
              onClick={onAnalyticsClick}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <BarChart3 className="w-3 h-3" />
              Analytics
            </button>
          )}
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </div>

              {allTags.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          setFilterTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          filterTags.includes(tag)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { key: 'all', label: 'All', count: conversations.filter(c => !c.isArchived).length },
          { key: 'starred', label: 'Starred', count: starredConversations.length, icon: Star },
          { key: 'recent', label: 'Recent', count: recentConversations.length, icon: Clock },
          { key: 'archived', label: 'Archived', count: conversations.filter(c => c.isArchived).length, icon: Archive }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            <span className="text-xs bg-gray-700 px-1 rounded">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Start a new conversation to get started'}
              </p>
            </div>
          ) : (
            filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'hover:bg-gray-700/50'
                } ${selectedConversation === conversation.id ? 'ring-2 ring-emerald-500' : ''}`}
                onClick={() => {
                  onConversationSelect(conversation.id);
                  setSelectedConversation(null);
                }}
              >
                {/* Conversation content */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white truncate">
                        {conversation.title}
                      </h3>
                      {conversation.isStarred && (
                        <Star className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate mb-2">
                      {getConversationPreview(conversation)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDate(conversation.updatedAt)}</span>
                      <span>{conversation.messages.length} messages</span>
                      {conversation.tags && conversation.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{conversation.tags.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConversation(
                          selectedConversation === conversation.id ? null : conversation.id
                        );
                      }}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Action dropdown */}
                    <AnimatePresence>
                      {selectedConversation === conversation.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-8 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 z-10 min-w-40"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConversationAction('star', conversation.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                          >
                            <Star className={`w-4 h-4 ${conversation.isStarred ? 'text-yellow-400 fill-current' : ''}`} />
                            {conversation.isStarred ? 'Unstar' : 'Star'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConversationAction('archive', conversation.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                          >
                            <Archive className="w-4 h-4" />
                            {conversation.isArchived ? 'Unarchive' : 'Archive'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConversationAction('delete', conversation.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Tags */}
                {conversation.tags && conversation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conversation.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {conversation.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                        +{conversation.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick Responses */}
      {quickResponses.length > 0 && (
        <div className="border-t border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Quick Responses</h3>
          <div className="space-y-1">
            {quickResponses.slice(0, 3).map(response => (
              <button
                key={response.id}
                onClick={() => onQuickResponse(response)}
                className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {response.icon && <span>{response.icon}</span>}
                  <span className="truncate">{response.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Environment */}
      {sensorData && (
        <div className="border-t border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" />
            Current Environment
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                Temperature
              </span>
              <span className="text-xs text-gray-300">
                {Math.round((sensorData.temperature * 9/5) + 32)}°F
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                Humidity
              </span>
              <span className="text-xs text-gray-300">{sensorData.humidity}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Sun className="w-3 h-3" />
                Light
              </span>
              <span className="text-xs text-gray-300">{sensorData.lightIntensity}μmol</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                pH Level
              </span>
              <span className="text-xs text-gray-300">{sensorData.ph}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings button */}
      {onSettingsClick && (
        <div className="border-t border-gray-700 p-4">
          <Button
            variant="outline"
            onClick={onSettingsClick}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Chat Settings
          </Button>
        </div>
      )}
    </div>
  );
}

export default ChatSidebar;