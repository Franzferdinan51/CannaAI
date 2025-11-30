'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Archive,
  Star,
  Calendar,
  Tag,
  Clock,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Copy,
  Share,
  BarChart3,
  Users
} from 'lucide-react';

import { ChatConversation } from './types';

interface ConversationManagerProps {
  conversations: ChatConversation[];
  currentConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onConversationArchive: (conversationId: string) => void;
  onConversationStar: (conversationId: string) => void;
  onConversationRename?: (conversationId: string, newName: string) => void;
  onExportChat?: (format: 'json' | 'csv' | 'txt') => void;
  onImportChat?: (file: File) => void;
  onClose?: () => void;
  className?: string;
}

export function ConversationManager({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete,
  onConversationArchive,
  onConversationStar,
  onConversationRename,
  onExportChat,
  onImportChat,
  onClose,
  className = ''
}: ConversationManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'starred' | 'archived' | 'active'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'messages'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Status filter
    switch (filterStatus) {
      case 'starred':
        filtered = filtered.filter(c => c.isStarred);
        break;
      case 'archived':
        filtered = filtered.filter(c => c.isArchived);
        break;
      case 'active':
        filtered = filtered.filter(c => !c.isArchived);
        break;
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'messages':
          comparison = a.messages.length - b.messages.length;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [conversations, searchQuery, filterStatus, sortBy, sortOrder]);

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Handle conversation actions
  const handleConversationAction = (action: string, conversationId: string) => {
    switch (action) {
      case 'delete':
        onConversationDelete(conversationId);
        break;
      case 'archive':
        onConversationArchive(conversationId);
        break;
      case 'star':
        onConversationStar(conversationId);
        break;
      case 'rename':
        if (onConversationRename && editName.trim()) {
          onConversationRename(conversationId, editName.trim());
          setEditingConversation(null);
          setEditName('');
        }
        break;
      default:
        break;
    }
  };

  // Toggle conversation selection
  const toggleConversationSelection = (conversationId: string) => {
    const newSelection = new Set(selectedConversations);
    if (newSelection.has(conversationId)) {
      newSelection.delete(conversationId);
    } else {
      newSelection.add(conversationId);
    }
    setSelectedConversations(newSelection);
  };

  // Select/deselect all conversations
  const toggleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(filteredConversations.map(c => c.id)));
    }
  };

  // Bulk actions
  const bulkArchive = () => {
    selectedConversations.forEach(id => onConversationArchive(id));
    setSelectedConversations(new Set());
  };

  const bulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedConversations.size} conversation(s)?`)) {
      selectedConversations.forEach(id => onConversationDelete(id));
      setSelectedConversations(new Set());
    }
  };

  const bulkExport = () => {
    if (onExportChat) {
      onExportChat('json');
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Conversation Manager</h2>
            <span className="px-2 py-1 bg-gray-700 text-gray-300 text-sm rounded">
              {filteredConversations.length} conversations
            </span>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Conversations</option>
            <option value="active">Active</option>
            <option value="starred">Starred</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              setSortBy(sort as any);
              setSortOrder(order as any);
            }}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="messages-desc">Most Messages</option>
            <option value="messages-asc">Fewest Messages</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedConversations.size > 0 && (
          <div className="flex items-center justify-between mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <span className="text-emerald-400 text-sm">
              {selectedConversations.size} conversation{selectedConversations.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={bulkArchive}
                className="border-gray-600 text-gray-300"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              {onExportChat && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={bulkExport}
                  className="border-gray-600 text-gray-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={bulkDelete}
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Start chatting to create conversations'}
              </p>
            </div>
          ) : (
            filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`p-4 bg-gray-700 rounded-lg border ${
                  currentConversationId === conversation.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedConversations.has(conversation.id)}
                    onChange={() => toggleConversationSelection(conversation.id)}
                    className="mt-1 rounded text-emerald-500 focus:ring-emerald-500"
                  />

                  {/* Expand/Collapse */}
                  <button
                    onClick={() => setExpandedConversation(
                      expandedConversation === conversation.id ? null : conversation.id
                    )}
                    className="mt-1 text-gray-400 hover:text-white"
                  >
                    {expandedConversation === conversation.id ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Conversation Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {editingConversation === conversation.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleConversationAction('rename', conversation.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleConversationAction('rename', conversation.id);
                            } else if (e.key === 'Escape') {
                              setEditingConversation(null);
                              setEditName('');
                            }
                          }}
                          className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                          autoFocus
                        />
                      ) : (
                        <>
                          <h3
                            className="font-medium text-white cursor-pointer hover:text-emerald-400"
                            onClick={() => onConversationSelect(conversation.id)}
                          >
                            {conversation.title}
                          </h3>
                          <button
                            onClick={() => {
                              setEditingConversation(conversation.id);
                              setEditName(conversation.title);
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      {conversation.isStarred && (
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      )}
                      {conversation.isArchived && (
                        <Archive className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <span>{formatDate(conversation.updatedAt)}</span>
                      <span>{conversation.messages.length} messages</span>
                      {conversation.tags && conversation.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {conversation.tags.length}
                        </span>
                      )}
                    </div>

                    {/* Preview */}
                    <p className="text-sm text-gray-300 truncate">
                      {conversation.messages.length > 0
                        ? conversation.messages[conversation.messages.length - 1].content.substring(0, 100)
                        : 'No messages'
                      }
                    </p>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedConversation === conversation.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-gray-600 space-y-2"
                        >
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>Created: {new Date(conversation.createdAt).toLocaleDateString()}</span>
                            <span>Last active: {new Date(conversation.updatedAt).toLocaleString()}</span>
                          </div>

                          {conversation.tags && conversation.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {conversation.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Message count by type */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-blue-400" />
                              <span className="text-gray-300">
                                User: {conversation.messages.filter(m => m.role === 'user').length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-emerald-400" />
                              <span className="text-gray-300">
                                AI: {conversation.messages.filter(m => m.role === 'assistant').length}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onConversationSelect(conversation.id)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                      title="Open conversation"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onConversationStar(conversation.id)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                      title={conversation.isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star className={`w-4 h-4 ${conversation.isStarred ? 'text-yellow-400 fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => onConversationArchive(conversation.id)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                      title={conversation.isArchived ? 'Unarchive' : 'Archive'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this conversation?')) {
                          onConversationDelete(conversation.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedConversations.size === filteredConversations.length && filteredConversations.length > 0}
            onChange={toggleSelectAll}
            className="rounded text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-400">Select all</span>
        </div>

        <div className="flex items-center gap-2">
          {onImportChat && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) onImportChat(file);
                };
                input.click();
              }}
              className="border-gray-600 text-gray-300"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          )}
          {onExportChat && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportChat('json')}
              className="border-gray-600 text-gray-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationManager;