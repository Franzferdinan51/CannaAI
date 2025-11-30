'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  X,
  Save,
  Download,
  Eye,
  Settings,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Grid,
  List,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Image,
  Table,
  Layout,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Zap,
  Clock,
  Target,
  Users,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Monitor,
  Smartphone,
  FileSpreadsheet,
  FileDown,
  FileImage,
  Share2,
  Schedule,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Minimize2,
  Copy,
  Trash2,
  Edit,
  Move,
  Lock,
  Unlock
} from 'lucide-react';

import {
  Report,
  ReportType,
  ReportCategory,
  ReportParameters,
  ReportSection,
  ReportLayout,
  ReportStyling,
  ChartConfiguration,
  TableConfiguration,
  ExportOptions,
  ExportFormat,
  ReportTemplate,
  ColorScheme,
  FontConfiguration
} from './types';

import { reportsApi, templatesApi, exportApi } from './api';
import { dateUtils, numberUtils, exportUtils, reportUtils } from './utils';

interface ReportBuilderProps {
  className?: string;
  initialReport?: Partial<Report>;
  onSave?: (report: Report) => void;
  onPreview?: (report: Partial<Report>) => void;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  className = '',
  initialReport,
  onSave,
  onPreview
}) => {
  // State management
  const [report, setReport] = useState<Partial<Report>>(() => ({
    name: '',
    description: '',
    type: 'summary',
    category: 'overview',
    status: 'draft',
    parameters: {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
        preset: 'month'
      },
      filters: {},
      format: 'pdf',
      includeCharts: true,
      includeTables: true,
      includeImages: false
    },
    layout: {
      sections: [
        { id: 'header', type: 'header', title: 'Report Header', order: 0, visible: true, configuration: {} },
        { id: 'summary', type: 'summary', title: 'Executive Summary', order: 1, visible: true, configuration: {} },
        { id: 'chart', type: 'chart', title: 'Performance Charts', order: 2, visible: true, configuration: {} },
        { id: 'table', type: 'table', title: 'Detailed Data', order: 3, visible: true, configuration: {} },
        { id: 'footer', type: 'footer', title: 'Report Footer', order: 4, visible: true, configuration: {} }
      ],
      styling: {
        theme: 'light',
        colors: {
          primary: '#10b981',
          secondary: '#3b82f6',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#111827',
          grid: '#e5e7eb'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter',
          mono: 'JetBrains Mono'
        },
        logo: '',
        branding: {
          name: 'CannaAI Pro',
          website: 'https://cannai.app',
          contact: 'support@cannai.app'
        }
      },
      charts: [],
      tables: []
    },
    metadata: {
      duration: 0,
      recordCount: 0,
      dataSource: 'database',
      version: '1.0',
      tags: [],
      permissions: {
        view: ['current_user'],
        edit: ['current_user'],
        share: true,
        public: false
      }
    },
    ...initialReport
  }));

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['header', 'summary']));
  const [activeTab, setActiveTab] = useState<'content' | 'styling' | 'export'>('content');

  const steps = [
    { id: 'basic', title: 'Basic Info', icon: FileText },
    { id: 'data', title: 'Data & Filters', icon: Database },
    { id: 'layout', title: 'Layout & Sections', icon: Layout },
    { id: 'styling', title: 'Styling', icon: Palette },
    { id: 'export', title: 'Export Options', icon: Download }
  ];

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templatesApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  // Update report
  const updateReport = (updates: Partial<Report>) => {
    setReport(prev => ({ ...prev, ...updates }));
  };

  // Update report parameters
  const updateParameters = (updates: Partial<ReportParameters>) => {
    setReport(prev => ({
      ...prev,
      parameters: { ...prev.parameters!, ...updates }
    }));
  };

  // Update report layout
  const updateLayout = (updates: Partial<ReportLayout>) => {
    setReport(prev => ({
      ...prev,
      layout: { ...prev.layout!, ...updates }
    }));
  };

  // Add section to layout
  const addSection = (type: ReportSection['type']) => {
    const newSection: ReportSection = {
      id: `section_${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Section`,
      order: (report.layout?.sections.length || 0),
      visible: true,
      configuration: {}
    };

    updateLayout({
      sections: [...(report.layout?.sections || []), newSection]
    });
  };

  // Remove section from layout
  const removeSection = (sectionId: string) => {
    updateLayout({
      sections: report.layout?.sections.filter(s => s.id !== sectionId) || []
    });
  };

  // Toggle section visibility
  const toggleSectionVisibility = (sectionId: string) => {
    updateLayout({
      sections: report.layout?.sections.map(section =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      ) || []
    });
  };

  // Move section up/down
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const sections = [...(report.layout?.sections || [])];
    const index = sections.findIndex(s => s.id === sectionId);

    if (direction === 'up' && index > 0) {
      [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
    } else if (direction === 'down' && index < sections.length - 1) {
      [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
    }

    updateLayout({ sections });
  };

  // Toggle section expansion
  const toggleSectionExpansion = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Apply template
  const applyTemplate = (template: ReportTemplate) => {
    setReport(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      type: template.type,
      category: template.category,
      parameters: { ...template.parameters },
      layout: { ...template.layout }
    }));
    setSelectedTemplate(template);
    setShowTemplates(false);
  };

  // Save report
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const savedReport = await reportsApi.createReport(report);
      if (savedReport) {
        onSave?.(savedReport);
        alert('Report saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save report:', error);
      alert('Failed to save report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Preview report
  const handlePreview = () => {
    setPreviewMode(true);
    onPreview?.(report);
  };

  // Export report
  const handleExport = async (format: ExportFormat) => {
    setIsLoading(true);
    try {
      const options: ExportOptions = {
        format,
        includeCharts: report.parameters?.includeCharts || true,
        includeRawData: false,
        includeMetadata: true
      };

      const downloadUrl = await exportApi.exportData({
        type: 'all',
        format,
        filters: report.parameters?.filters,
        dateRange: report.parameters?.dateRange
      });

      if (downloadUrl) {
        exportUtils.downloadFile(downloadUrl, `report_${report.name}.${format}`);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Validate current step
  const validateStep = (stepId: string): boolean => {
    switch (stepId) {
      case 'basic':
        return !!(report.name && report.type && report.category);
      case 'data':
        return !!(report.parameters?.dateRange?.start && report.parameters?.dateRange?.end);
      case 'layout':
        return !!(report.layout?.sections && report.layout.sections.length > 0);
      case 'styling':
        return true; // Styling is optional
      case 'export':
        return true; // Export is optional
      default:
        return true;
    }
  };

  // Get step validation status
  const getStepStatus = (stepId: string) => {
    const isValid = validateStep(stepId);
    const currentStepIndex = steps.findIndex(s => s.id === stepId);

    if (currentStepIndex < currentStep) {
      return isValid ? 'completed' : 'error';
    } else if (currentStepIndex === currentStep) {
      return isValid ? 'active' : 'invalid';
    } else {
      return 'pending';
    }
  };

  if (previewMode) {
    return (
      <div className={`bg-white min-h-screen ${className}`}>
        {/* Preview Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPreviewMode(false)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Report Preview</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {report.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewMode(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Report Header */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.name}</h1>
                  <p className="text-gray-600">{report.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Generated on</p>
                  <p className="text-lg font-medium text-gray-900">
                    {dateUtils.formatDateTime(new Date())}
                  </p>
                </div>
              </div>

              {/* Report Metadata */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium capitalize">{report.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium capitalize">{report.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date Range</p>
                  <p className="font-medium">
                    {dateUtils.formatDate(report.parameters?.dateRange?.start || new Date())} - {dateUtils.formatDate(report.parameters?.dateRange?.end || new Date())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium capitalize">{report.status}</p>
                </div>
              </div>
            </div>

            {/* Report Sections Preview */}
            {report.layout?.sections.filter(s => s.visible).map(section => (
              <div key={section.id} className="p-8 border-b border-gray-200 last:border-b-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h2>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-600">
                    {section.type === 'header' && 'Report header section will be displayed here with company branding and report metadata.'}
                    {section.type === 'summary' && 'Executive summary with key insights and recommendations will be displayed here.'}
                    {section.type === 'chart' && 'Interactive charts and data visualizations will be displayed here.'}
                    {section.type === 'table' && 'Detailed data tables with sorting and filtering capabilities will be displayed here.'}
                    {section.type === 'text' && 'Custom text content and descriptions will be displayed here.'}
                    {section.type === 'insights' && 'AI-powered insights and analysis will be displayed here.'}
                    {section.type === 'footer' && 'Report footer with page numbers and additional information will be displayed here.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#0B0D10] text-gray-300 min-h-screen ${className}`}>
      {/* Header */}
      <div className="bg-[#1A1D23] border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Report Builder</h1>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm rounded-full border border-emerald-500/50">
              {report.status === 'draft' ? 'Draft' : report.status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Layout className="w-4 h-4" />
              Templates
            </button>

            <button
              onClick={handlePreview}
              disabled={!validateStep('basic')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            <button
              onClick={handleSave}
              disabled={!validateStep('basic') || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center p-4 bg-[#252A33]">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const status = getStepStatus(step.id);

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(index)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    status === 'active' ? 'bg-emerald-600 text-white' :
                    status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50' :
                    status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/50' :
                    'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.title}</span>
                  {status === 'completed' && <CheckCircle className="w-4 h-4" />}
                  {status === 'error' && <AlertCircle className="w-4 h-4" />}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    status === 'completed' ? 'bg-emerald-500' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="bg-[#1A1D23] border-b border-gray-800 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Choose a Template</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="bg-[#252A33] border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium text-white">{template.name}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded capitalize">
                      {template.type}
                    </span>
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded capitalize">
                      {template.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 0 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Basic Information</h2>
                <p className="text-gray-400">Provide the basic details for your report</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={report.name}
                    onChange={(e) => updateReport({ name: e.target.value })}
                    placeholder="Enter a descriptive name for your report"
                    className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={report.description}
                    onChange={(e) => updateReport({ description: e.target.value })}
                    placeholder="Describe what this report contains"
                    rows={3}
                    className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Report Type *
                    </label>
                    <select
                      value={report.type}
                      onChange={(e) => updateReport({ type: e.target.value as ReportType })}
                      className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="summary">Summary</option>
                      <option value="detailed">Detailed</option>
                      <option value="comparison">Comparison</option>
                      <option value="trend">Trend</option>
                      <option value="financial">Financial</option>
                      <option value="growth">Growth</option>
                      <option value="yield">Yield</option>
                      <option value="environmental">Environmental</option>
                      <option value="plant_health">Plant Health</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={report.category}
                      onChange={(e) => updateReport({ category: e.target.value as ReportCategory })}
                      className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="overview">Overview</option>
                      <option value="plants">Plants</option>
                      <option value="sensors">Sensors</option>
                      <option value="environment">Environment</option>
                      <option value="automation">Automation</option>
                      <option value="financial">Financial</option>
                      <option value="yield">Yield</option>
                      <option value="growth">Growth</option>
                      <option value="health">Health</option>
                      <option value="operational">Operational</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Data & Filters</h2>
                <p className="text-gray-400">Configure the data sources and filters for your report</p>
              </div>

              <div className="space-y-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Range *
                  </label>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={report.parameters?.dateRange?.start?.toISOString().split('T')[0]}
                        onChange={(e) => updateParameters({
                          dateRange: {
                            ...report.parameters!.dateRange!,
                            start: new Date(e.target.value)
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <input
                        type="date"
                        value={report.parameters?.dateRange?.end?.toISOString().split('T')[0]}
                        onChange={(e) => updateParameters({
                          dateRange: {
                            ...report.parameters!.dateRange!,
                            end: new Date(e.target.value)
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {['today', 'yesterday', 'week', 'month', 'quarter', 'year'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          const range = dateUtils.getDateRangePreset(preset);
                          updateParameters({ dateRange: { ...range, preset } });
                        }}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm capitalize"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Include Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Include in Report
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={report.parameters?.includeCharts}
                        onChange={(e) => updateParameters({ includeCharts: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                      />
                      Include Charts and Visualizations
                    </label>

                    <label className="flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={report.parameters?.includeTables}
                        onChange={(e) => updateParameters({ includeTables: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                      />
                      Include Data Tables
                    </label>

                    <label className="flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={report.parameters?.includeImages}
                        onChange={(e) => updateParameters({ includeImages: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                      />
                      Include Images and Media
                    </label>
                  </div>
                </div>

                {/* Filters */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data Filters
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rooms</label>
                      <input
                        type="text"
                        placeholder="Select rooms (optional)"
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Plants</label>
                      <input
                        type="text"
                        placeholder="Select plants (optional)"
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Strains</label>
                      <input
                        type="text"
                        placeholder="Select strains (optional)"
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Layout & Sections</h2>
                  <p className="text-gray-400">Arrange and configure the sections of your report</p>
                </div>
                <button
                  onClick={() => addSection('chart')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              </div>

              {/* Sections List */}
              <div className="space-y-3">
                {report.layout?.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="bg-[#1A1D23] border border-gray-800 rounded-lg overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252A33]/50 transition-colors"
                      onClick={() => toggleSectionExpansion(section.id)}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedSections.has(section.id) ? '' : 'rotate-180'
                          }`}
                        />
                        <span className="font-medium text-white">{section.title}</span>
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded capitalize">
                          {section.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSectionVisibility(section.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            section.visible
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-gray-500 hover:bg-gray-700'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'down');
                          }}
                          disabled={index === (report.layout?.sections.length || 0) - 1}
                          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(section.id);
                          }}
                          className="p-1 text-red-400 hover:text-white hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {expandedSections.has(section.id) && (
                      <div className="p-4 pt-0 border-t border-gray-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Section Title</label>
                            <input
                              type="text"
                              value={section.title}
                              onChange={(e) => {
                                const sections = report.layout?.sections.map(s =>
                                  s.id === section.id ? { ...s, title: e.target.value } : s
                                ) || [];
                                updateLayout({ sections });
                              }}
                              className="w-full px-3 py-1 bg-[#252A33] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Section Type</label>
                            <select
                              value={section.type}
                              onChange={(e) => {
                                const sections = report.layout?.sections.map(s =>
                                  s.id === section.id ? { ...s, type: e.target.value as ReportSection['type'] } : s
                                ) || [];
                                updateLayout({ sections });
                              }}
                              className="w-full px-3 py-1 bg-[#252A33] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                            >
                              <option value="header">Header</option>
                              <option value="summary">Summary</option>
                              <option value="chart">Chart</option>
                              <option value="table">Table</option>
                              <option value="text">Text</option>
                              <option value="insights">Insights</option>
                              <option value="footer">Footer</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Order</label>
                          <input
                            type="number"
                            value={section.order}
                            onChange={(e) => {
                              const sections = report.layout?.sections.map(s =>
                                s.id === section.id ? { ...s, order: parseInt(e.target.value) } : s
                              ) || [];
                              updateLayout({ sections });
                            }}
                            className="w-full px-3 py-1 bg-[#252A33] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Styling</h2>
                <p className="text-gray-400">Customize the appearance of your report</p>
              </div>

              <div className="space-y-4">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['light', 'dark', 'auto'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updateLayout({
                          styling: { ...report.layout!.styling!, theme: theme as any }
                        })}
                        className={`p-3 border rounded-lg capitalize transition-colors ${
                          report.layout?.styling?.theme === theme
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Branding */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Branding
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={report.layout?.styling?.branding?.name || ''}
                        onChange={(e) => updateLayout({
                          styling: {
                            ...report.layout!.styling!,
                            branding: { ...report.layout!.styling!.branding!, name: e.target.value }
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Website</label>
                        <input
                          type="url"
                          value={report.layout?.styling?.branding?.website || ''}
                          onChange={(e) => updateLayout({
                            styling: {
                              ...report.layout!.styling!,
                              branding: { ...report.layout!.styling!.branding!, website: e.target.value }
                            }
                          })}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Contact</label>
                        <input
                          type="email"
                          value={report.layout?.styling?.branding?.contact || ''}
                          onChange={(e) => updateLayout({
                            styling: {
                              ...report.layout!.styling!,
                              branding: { ...report.layout!.styling!.branding!, contact: e.target.value }
                            }
                          })}
                          placeholder="contact@example.com"
                          className="w-full px-3 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fonts */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Typography
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Heading Font</label>
                      <select
                        value={report.layout?.styling?.fonts?.heading || 'Inter'}
                        onChange={(e) => updateLayout({
                          styling: {
                            ...report.layout!.styling!,
                            fonts: { ...report.layout!.styling!.fonts!, heading: e.target.value }
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Lato">Lato</option>
                        <option value="Montserrat">Montserrat</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Body Font</label>
                      <select
                        value={report.layout?.styling?.fonts?.body || 'Inter'}
                        onChange={(e) => updateLayout({
                          styling: {
                            ...report.layout!.styling!,
                            fonts: { ...report.layout!.styling!.fonts!, body: e.target.value }
                          }
                        })}
                        className="w-full px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Lato">Lato</option>
                        <option value="Montserrat">Montserrat</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Export Options</h2>
                <p className="text-gray-400">Configure how your report will be exported</p>
              </div>

              <div className="space-y-4">
                {/* Default Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Export Format
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {['pdf', 'csv', 'excel', 'json'].map((format) => (
                      <button
                        key={format}
                        onClick={() => updateParameters({ format: format as any })}
                        className={`flex flex-col items-center gap-2 p-3 border rounded-lg capitalize transition-colors ${
                          report.parameters?.format === format
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                        }`}
                      >
                        <FileText className="w-6 h-6" />
                        <span className="text-sm">{format}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Export Settings
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={report.parameters?.includeCharts}
                        onChange={(e) => updateParameters({ includeCharts: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                      />
                      Include charts in export
                    </label>

                    <label className="flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                      />
                      Include metadata and timestamps
                    </label>

                    <label className="flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                      />
                      Add page numbers and headers
                    </label>
                  </div>
                </div>

                {/* Quick Export */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quick Export
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['pdf', 'csv', 'excel'].map((format) => (
                      <button
                        key={format}
                        onClick={() => handleExport(format as any)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export as {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel - Report Info */}
        <div className="w-80 bg-[#1A1D23] border-l border-gray-800 p-6">
          <div className="space-y-6">
            {/* Report Summary */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Report Summary
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm text-white font-medium">{report.name || 'Untitled Report'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm text-gray-300 capitalize">{report.type}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm text-gray-300 capitalize">{report.category}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Sections</p>
                  <p className="text-sm text-gray-300">{report.layout?.sections.length || 0} configured</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Complexity Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${Math.min(reportUtils.calculateComplexity(report), 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {reportUtils.calculateComplexity(report)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimation */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Estimations
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Generation Time</p>
                  <p className="text-sm text-gray-300">
                    ~{Math.ceil(reportUtils.getEstimatedGenerationTime(report) / 1000)}s
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Estimated Records</p>
                  <p className="text-sm text-gray-300">
                    {Math.floor(Math.random() * 5000) + 1000} records
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">File Size (PDF)</p>
                  <p className="text-sm text-gray-300">~{Math.floor(Math.random() * 5) + 2} MB</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handlePreview}
                disabled={!validateStep('basic')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                Preview Report
              </button>

              <button
                onClick={handleSave}
                disabled={!validateStep('basic') || isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#1A1D23] border-t border-gray-800 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep
                    ? 'bg-emerald-500'
                    : index < currentStep
                    ? 'bg-emerald-400'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1 || !validateStep(steps[currentStep].id)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;