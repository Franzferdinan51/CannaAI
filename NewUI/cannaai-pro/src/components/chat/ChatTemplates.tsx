'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash,
  Search,
  Filter,
  Plus,
  X,
  Star,
  Clock,
  TrendingUp,
  AlertTriangle,
  Heart,
  Brain,
  Leaf,
  FlaskConical,
  Bug,
  Thermometer,
  Droplets,
  Sun,
  Zap,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Share,
  Bookmark,
  Play,
  Settings,
  Sparkles
} from 'lucide-react';

import { ChatTemplate, TemplateVariable } from './types';

interface ChatTemplatesProps {
  templates: ChatTemplate[];
  onTemplateSelect: (template: ChatTemplate, variables?: Record<string, any>) => void;
  onClose?: () => void;
  onCreateTemplate?: (template: Omit<ChatTemplate, 'id'>) => void;
  onEditTemplate?: (templateId: string, template: Partial<ChatTemplate>) => void;
  onDeleteTemplate?: (templateId: string) => void;
  showSearch?: boolean;
  showCategories?: boolean;
  showCreateButton?: boolean;
  className?: string;
}

export function ChatTemplates({
  templates,
  onTemplateSelect,
  onClose,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  showSearch = true,
  showCategories = true,
  showCreateButton = true,
  className = ''
}: ChatTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [templateVariables, setTemplateVariables] = useState<Record<string, Record<string, any>>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChatTemplate | null>(null);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => cats.add(t.category));
    return Array.from(cats).sort();
  }, [templates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: quick actions first, then by sort order, then by name
    return filtered.sort((a, b) => {
      if (a.isQuickAction !== b.isQuickAction) {
        return a.isQuickAction ? -1 : 1;
      }
      if (a.sortOrder !== b.sortOrder) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [templates, selectedCategory, searchQuery]);

  // Category icons
  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'general': <Brain className="w-4 h-4" />,
      'plant-care': <Leaf className="w-4 h-4" />,
      'troubleshooting': <AlertTriangle className="w-4 h-4" />,
      'nutrients': <FlaskConical className="w-4 h-4" />,
      'environment': <Thermometer className="w-4 h-4" />,
      'harvesting': <Heart className="w-4 h-4" />,
      'pest-disease': <Bug className="w-4 h-4" />
    };
    return iconMap[category] || <Hash className="w-4 h-4" />;
  };

  // Handle template execution
  const handleTemplateExecute = (template: ChatTemplate) => {
    if (template.variables && template.variables.length > 0) {
      // Check if we have all required variables
      const currentVars = templateVariables[template.id] || {};
      const missingRequired = template.variables.filter(v => v.required && !currentVars[v.name]);

      if (missingRequired.length > 0) {
        // Expand the template to show variable inputs
        setExpandedTemplates(prev => new Set(prev).add(template.id));
        return;
      }
    }

    onTemplateSelect(template, templateVariables[template.id]);
    if (onClose) onClose();
  };

  // Handle variable input
  const handleVariableChange = (templateId: string, varName: string, value: any) => {
    setTemplateVariables(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [varName]: value
      }
    }));
  };

  // Toggle template expansion
  const toggleTemplateExpansion = (templateId: string) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // Render variable input
  const renderVariableInput = (template: ChatTemplate, variable: TemplateVariable) => {
    const value = templateVariables[template.id]?.[variable.name] ?? variable.defaultValue ?? '';

    switch (variable.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={variable.placeholder || `Enter ${variable.label}`}
            value={value as string}
            onChange={(e) => handleVariableChange(template.id, variable.name, e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            required={variable.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            placeholder={variable.placeholder || `Enter ${variable.label}`}
            value={value as number}
            onChange={(e) => handleVariableChange(template.id, variable.name, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            required={variable.required}
          />
        );

      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleVariableChange(template.id, variable.name, e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            required={variable.required}
          >
            <option value="">Select {variable.label}</option>
            {variable.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = (value as string[] || []);
        return (
          <div className="space-y-2">
            {variable.options?.map(option => (
              <label key={option} className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    handleVariableChange(template.id, variable.name, newValues);
                  }}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
                {option}
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Chat Templates</h2>
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
      </div>

      {/* Search */}
      {showSearch && (
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Categories */}
      {showCategories && categories.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All ({templates.length})
            </button>
            {categories.map(category => {
              const count = templates.filter(t => t.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                    selectedCategory === category
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {getCategoryIcon(category)}
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4 space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <Hash className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No templates found</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Create your first template'}
              </p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div
                key={template.id}
                className="bg-gray-700 border border-gray-600 rounded-lg overflow-hidden"
              >
                <div className="p-4">
                  {/* Template header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {template.icon && (
                          <span className="text-emerald-400">{template.icon}</span>
                        )}
                        <h3 className="font-medium text-white">{template.name}</h3>
                        {template.isQuickAction && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                            Quick Action
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTemplateExecute(template)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded"
                        title="Use template"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      {template.variables && template.variables.length > 0 && (
                        <button
                          onClick={() => toggleTemplateExpansion(template.id)}
                          className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                          title="Template variables"
                        >
                          {expandedTemplates.has(template.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variables */}
                  <AnimatePresence>
                    {expandedTemplates.has(template.id) && template.variables && template.variables.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-gray-600 space-y-3"
                      >
                        {template.variables.map(variable => (
                          <div key={variable.name}>
                            <label className="block text-sm text-gray-300 mb-1">
                              {variable.label}
                              {variable.required && <span className="text-red-400 ml-1">*</span>}
                            </label>
                            {renderVariableInput(template, variable)}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleTemplateExecute(template)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Use Template
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleTemplateExpansion(template.id)}
                            className="border-gray-600 text-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Template Button */}
      {showCreateButton && onCreateTemplate && (
        <div className="p-4 border-t border-gray-700">
          <Button
            onClick={() => setShowCreateForm(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Template
          </Button>
        </div>
      )}

      {/* Create/Edit Template Form */}
      <AnimatePresence>
        {(showCreateForm || editingTemplate) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setShowCreateForm(false);
              setEditingTemplate(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter template name"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe what this template does"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Category
                  </label>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                    <option value="general">General</option>
                    <option value="plant-care">Plant Care</option>
                    <option value="troubleshooting">Troubleshooting</option>
                    <option value="nutrients">Nutrients</option>
                    <option value="environment">Environment</option>
                    <option value="pest-disease">Pest & Disease</option>
                    <option value="harvesting">Harvesting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Template Prompt
                  </label>
                  <textarea
                    placeholder="Enter the template prompt. Use {variable_name} for variables."
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    Quick Action
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingTemplate(null);
                    }}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatTemplates;