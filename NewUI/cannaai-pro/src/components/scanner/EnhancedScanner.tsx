import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Camera, Scan, Brain, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Loader2, FileText, Settings, Activity, Droplets, Thermometer,
  Sun, Wind, Sprout, FlaskConical, Bug, Zap, Eye, Clock, ChevronDown,
  Info, AlertCircle, Plus, Minus, Save, Trash2, Download, Grid, List
} from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

// Import modular components
import CameraCapture from './CameraCapture';
import EnvironmentalForm from './EnvironmentalForm';
import AnalysisResults from './AnalysisResults';
import StrainSelector from './StrainSelector';

// Import utilities
import {
  generateBatchId,
  validateImageFile,
  compressImage,
  fileToBase64,
  calculateScannerStats,
  getHealthStatus
} from '../../lib/scanner-utils';

// Import types from the types file
import {
  PlantAnalysis,
  AnalysisFormData,
  PlantImage,
  Strain,
  ScannerStats
} from '../../types/scanner';

const EnhancedScanner: React.FC = () => {
  // State management
  const [images, setImages] = useState<PlantImage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [scannerStats, setScannerStats] = useState<ScannerStats | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<AnalysisFormData>({
    strain: '',
    leafSymptoms: '',
    phLevel: '',
    temperature: '',
    humidity: '',
    medium: 'soil',
    growthStage: 'vegetative',
    temperatureUnit: 'F',
    pestDiseaseFocus: 'general',
    urgency: 'medium',
    additionalNotes: ''
  });

  const selectedImage = images.find(img => img.id === selectedId);

  // Update scanner stats when images change
  useEffect(() => {
    const stats = calculateScannerStats(images);
    setScannerStats(stats);
  }, [images]);

  // File upload handler with validation and compression
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      const base64String = await fileToBase64(compressedBlob);
      setCurrentImage(base64String);
      toast.success('Image uploaded and compressed successfully');
    } catch (error) {
      console.error('Image processing failed:', error);
      toast.error('Failed to process image. Please try another file.');
    }
  };

  // Form handlers
  const handleInputChange = (field: keyof AnalysisFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      strain: '',
      leafSymptoms: '',
      phLevel: '',
      temperature: '',
      humidity: '',
      medium: 'soil',
      growthStage: 'vegetative',
      temperatureUnit: 'F',
      pestDiseaseFocus: 'general',
      urgency: 'medium',
      additionalNotes: ''
    });
    setCurrentImage('');
  };

  // Analysis handler
  const handleAnalysis = async () => {
    if (!formData.strain) {
      toast.error('Please select a strain');
      return;
    }

    if (!formData.leafSymptoms && !currentImage) {
      toast.error('Please provide symptoms or upload an image');
      return;
    }

    setIsAnalyzing(true);

    const newImage: PlantImage = {
      id: Date.now().toString(),
      url: currentImage || '/placeholder-plant.png',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Processing',
      batchId: generateBatchId(),
      strain: formData.strain,
      formData: { ...formData }
    };

    setImages(prev => [newImage, ...prev]);
    setSelectedId(newImage.id);

    try {
      const analysisPayload = {
        ...formData,
        plantImage: currentImage || undefined
      };

      const response = await api.analyze(analysisPayload);

      if (response.success) {
        setImages(prev => prev.map(img => {
          if (img.id === newImage.id) {
            return {
              ...img,
              status: getHealthStatus(response.analysis.healthScore),
              analysis: response.analysis
            };
          }
          return img;
        }));

        toast.success('Analysis completed successfully!');
      } else {
        throw new Error(response.error?.message || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setImages(prev => prev.map(img => {
        if (img.id === newImage.id) {
          return { ...img, status: 'Critical' };
        }
        return img;
      }));

      toast.error(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Status pill component
  const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const getClasses = () => {
      switch (status) {
        case 'Healthy':
          return 'bg-emerald-900/80 text-emerald-300 border-emerald-700/50';
        case 'Warning':
          return 'bg-orange-900/80 text-orange-300 border-orange-700/50';
        case 'Critical':
          return 'bg-red-900/80 text-red-300 border-red-700/50';
        case 'Processing':
          return 'bg-gray-700/80 text-gray-300 border-gray-600/50';
        default:
          return 'bg-gray-700 text-gray-300';
      }
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border ${getClasses()}`}>
        {status}
      </span>
    );
  };

  // Urgency indicator
  const UrgencyIndicator: React.FC<{ urgency: string }> = ({ urgency }) => {
    const getConfig = () => {
      switch (urgency) {
        case 'critical': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
        case 'high': return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
        case 'medium': return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
        default: return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      }
    };

    const config = getConfig();

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${config.color} ${config.bg} ${config.border} border`}>
        {urgency}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Plant Health Scanner</h1>
            <p className="text-gray-400">AI-powered plant analysis with strain detection</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Capture Section */}
          <div className="bg-[#181b21] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2 text-emerald-400" />
              Image Capture
            </h3>

            {!cameraActive && !currentImage && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-700 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                  >
                    <Upload className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-sm text-gray-400">Upload Image</span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG up to 50MB</span>
                  </button>

                  <button
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-700 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                  >
                    <Camera className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-sm text-gray-400">Use Camera</span>
                    <span className="text-xs text-gray-500 mt-1">Live photo capture</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {cameraActive && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover"
                  />
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {currentImage && !cameraActive && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <img
                    src={currentImage}
                    alt="Captured plant"
                    className="w-full h-64 object-contain"
                  />
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setCurrentImage('')}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Image
                  </button>
                  <button
                    onClick={startCamera}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Retake
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Analysis Form */}
          <div className="bg-[#181b21] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-emerald-400" />
              Analysis Information
            </h3>

            <div className="space-y-4">
              {/* Strain Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strain</label>
                <select
                  value={formData.strain}
                  onChange={(e) => handleInputChange('strain', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select Strain</option>
                  {strains.map(strain => (
                    <option key={strain.id} value={strain.name}>
                      {strain.name} ({strain.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Symptoms Description</label>
                <textarea
                  placeholder="Describe what you observe: yellowing leaves, spots, curling, etc."
                  value={formData.leafSymptoms}
                  onChange={(e) => handleInputChange('leafSymptoms', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Environmental Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">pH Level</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.2"
                    value={formData.phLevel}
                    onChange={(e) => handleInputChange('phLevel', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="75"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Humidity (%)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="50"
                    value={formData.humidity}
                    onChange={(e) => handleInputChange('humidity', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Growth Stage</label>
                  <select
                    value={formData.growthStage}
                    onChange={(e) => handleInputChange('growthStage', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="seedling">Seedling</option>
                    <option value="vegetative">Vegetative</option>
                    <option value="flowering">Flowering</option>
                    <option value="harvest">Harvest</option>
                  </select>
                </div>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Growing Medium</label>
                      <select
                        value={formData.medium}
                        onChange={(e) => handleInputChange('medium', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="soil">Soil</option>
                        <option value="hydroponic">Hydroponic</option>
                        <option value="coco">Coco Coir</option>
                        <option value="aeroponic">Aeroponic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Focus Area</label>
                      <select
                        value={formData.pestDiseaseFocus}
                        onChange={(e) => handleInputChange('pestDiseaseFocus', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="general">General Health</option>
                        <option value="pests">Pests</option>
                        <option value="diseases">Diseases</option>
                        <option value="nutrients">Nutrients</option>
                        <option value="environmental">Environmental</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Urgency</label>
                      <select
                        value={formData.urgency}
                        onChange={(e) => handleInputChange('urgency', e.target.value as any)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Additional Notes</label>
                    <textarea
                      placeholder="Any additional information that might help with the analysis..."
                      value={formData.additionalNotes}
                      onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAnalysis}
                  disabled={isAnalyzing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Analyze Plant
                    </>
                  )}
                </button>

                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Selected Image Analysis */}
          {selectedImage && (
            <div className="bg-[#181b21] rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-emerald-400" />
                  Analysis Results
                </h3>

                <div className="space-y-4">
                  {/* Status and Health Score */}
                  <div className="flex items-center justify-between">
                    <StatusPill status={selectedImage.status} />
                    {selectedImage.analysis && (
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          selectedImage.analysis.healthScore > 70 ? "text-emerald-400" :
                          selectedImage.analysis.healthScore > 40 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {selectedImage.analysis.healthScore}%
                        </div>
                        <div className="text-xs text-gray-500">Health Score</div>
                      </div>
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Strain:</span>
                      <span className="text-white">{selectedImage.strain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Batch:</span>
                      <span className="text-white">{selectedImage.batchId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time:</span>
                      <span className="text-white">{selectedImage.timestamp}</span>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  {selectedImage.analysis && (
                    <div className="space-y-4">
                      {/* Diagnosis */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Diagnosis</h4>
                        <p className="text-white font-medium">{selectedImage.analysis.diagnosis}</p>
                        {selectedImage.analysis.confidence && (
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500">Confidence:</span>
                            <div className="flex-1 mx-2 bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${selectedImage.analysis.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{selectedImage.analysis.confidence}%</span>
                          </div>
                        )}
                      </div>

                      {/* Urgency */}
                      {selectedImage.analysis.urgency && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Urgency</h4>
                          <UrgencyIndicator urgency={selectedImage.analysis.urgency} />
                        </div>
                      )}

                      {/* Purple Strain Analysis */}
                      {selectedImage.analysis.purpleAnalysis && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Purple Analysis</h4>
                          <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/30">
                            <p className="text-xs text-purple-300">
                              {selectedImage.analysis.purpleAnalysis.analysis}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Key Findings */}
                      {selectedImage.analysis.symptomsMatched && selectedImage.analysis.symptomsMatched.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Symptoms Identified</h4>
                          <div className="space-y-1">
                            {selectedImage.analysis.symptomsMatched.slice(0, 3).map((symptom, i) => (
                              <div key={i} className="flex items-start text-xs text-gray-300">
                                <span className="mr-2 text-emerald-500">•</span>
                                {symptom}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Immediate Recommendations */}
                      {selectedImage.analysis.recommendations?.immediate && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Immediate Actions</h4>
                          <div className="space-y-1">
                            {selectedImage.analysis.recommendations.immediate.slice(0, 3).map((rec, i) => (
                              <div key={i} className="flex items-start text-xs text-gray-300">
                                <span className="mr-2 text-red-500">•</span>
                                {rec}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-700">
                        <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
                          <FileText className="w-3 h-3" />
                          Report
                        </button>
                        <button
                          onClick={handleAnalysis}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Re-analyze
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedImage.status === 'Processing' && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                      <span className="text-sm text-gray-400">Analyzing plant health...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-[#181b21] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Analysis History</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Scans</span>
                <span className="text-sm font-medium text-white">{images.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Healthy Plants</span>
                <span className="text-sm font-medium text-emerald-400">
                  {images.filter(img => img.status === 'Healthy').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Need Attention</span>
                <span className="text-sm font-medium text-orange-400">
                  {images.filter(img => img.status === 'Warning' || img.status === 'Critical').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      {images.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Scans</h2>
          <div className={viewMode === 'grid' ?
            "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" :
            "space-y-3"
          }>
            {images.map((image) => (
              <motion.div
                key={image.id}
                whileHover={{ scale: viewMode === 'grid' ? 1.02 : 1.01 }}
                onClick={() => setSelectedId(image.id)}
                className={`relative ${
                  viewMode === 'grid' ? 'aspect-square' : 'flex items-center gap-4'
                } rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedId === image.id
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-gray-800 hover:border-gray-600'
                } bg-[#181b21]`}
              >
                {viewMode === 'grid' ? (
                  <>
                    <img src={image.url} alt="Plant" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-between p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono text-gray-300 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          {image.timestamp}
                        </span>
                        {selectedId === image.id && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex justify-center">
                        <StatusPill status={image.status} />
                      </div>
                    </div>
                    {image.status === 'Processing' && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1" />
                        <span className="text-xs font-medium text-white">Processing</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <img src={image.url} alt="Plant" className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{image.strain}</span>
                        <StatusPill status={image.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{image.timestamp}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{image.batchId}</span>
                      </div>
                    </div>
                    {selectedId === image.id && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedScanner;