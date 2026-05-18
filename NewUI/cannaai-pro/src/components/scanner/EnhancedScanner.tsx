import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Camera, Scan, Brain, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Loader2, FileText, Settings, Activity, Droplets, Thermometer,
  Sun, Wind, Sprout, FlaskConical, Bug, Zap, Eye, Clock, ChevronDown,
  Info, AlertCircle, Plus, Minus, Save, Trash2, Download, Grid, List,
  Leaf, Image as ImageIcon, Microscope, Smartphone, Monitor
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

// Analysis stage for visual progress
type AnalysisStage = 'idle' | 'capturing' | 'processing' | 'analyzing' | 'complete';

const EnhancedScanner: React.FC = () => {
  // State management
  const [images, setImages] = useState<PlantImage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [scannerStats, setScannerStats] = useState<ScannerStats | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  // Analysis stage for progress visualization
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<'webcam' | 'microscope' | 'mobile'>('webcam');

  // Strains state
  const [strains, setStrains] = useState<Strain[]>([]);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraMode === 'microscope' ? { width: 2048, height: 1536 } : undefined
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setAnalysisStage('capturing');
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setAnalysisStage('idle');
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const captured = canvas.toDataURL('image/jpeg', 0.95);
          setCurrentImage(captured);
          stopCamera();
          toast.success('Photo captured!');
        }
      }
    }
  };

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileFromDrop(file);
    }
  }, []);

  const handleFileFromDrop = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const compressedBlob = await compressImage(file);
      const base64String = await fileToBase64(compressedBlob);
      setCurrentImage(base64String);
      setAnalysisStage('capturing');
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Image processing failed:', error);
      toast.error('Failed to process image. Please try another file.');
    }
  };

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

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const compressedBlob = await compressImage(file);
      const base64String = await fileToBase64(compressedBlob);
      setCurrentImage(base64String);
      setAnalysisStage('capturing');
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
    setAnalysisStage('idle');
  };

  // Analysis handler with visual progress
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
    setAnalysisStage('processing');

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

    // Animate through stages
    setTimeout(() => setAnalysisStage('analyzing'), 1500);

    try {
      const analysisPayload = {
        ...formData,
        plantImage: currentImage || undefined
      };

      const response = await api.analyze(analysisPayload);

      if (response.success) {
        setAnalysisStage('complete');
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
      setAnalysisStage('idle');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Progress indicator component
  const AnalysisProgress: React.FC<{ stage: AnalysisStage }> = ({ stage }) => {
    const stages = [
      { key: 'capturing', label: 'Capturing Image', icon: Camera },
      { key: 'processing', label: 'Processing', icon: FlaskConical },
      { key: 'analyzing', label: 'AI Analysis', icon: Brain },
      { key: 'complete', label: 'Complete', icon: CheckCircle }
    ];

    const currentIndex = stages.findIndex(s => s.key === stage);

    return (
      <div className="space-y-3">
        {stages.map((s, index) => {
          const Icon = s.icon;
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0.5 }}
              animate={{
                opacity: isActive ? 1 : 0.4,
                scale: isCurrent ? 1.05 : 1
              }}
              className="flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
              } ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#181b21]' : ''}`}>
                {isCurrent ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-sm font-medium ${
                isCurrent ? 'text-emerald-400' : isActive ? 'text-gray-300' : 'text-gray-500'
              }`}>
                {s.label}
              </span>
              {isCurrent && (
                <motion.div
                  className="ml-auto"
                  initial={{ width: 0 }}
                  animate={{ width: 'auto' }}
                >
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
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

  // Health score ring component
  const HealthScoreRing: React.FC<{ score: number; size?: 'sm' | 'lg' }> = ({ score, size = 'sm' }) => {
    const radius = size === 'lg' ? 45 : 28;
    const stroke = size === 'lg' ? 6 : 4;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    const color = score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444';

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg className="transform -rotate-90" width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2}>
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-gray-700"
          />
          <motion.circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-${size === 'lg' ? 'xl' : 'sm'} font-bold`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="bg-gradient-to-br from-emerald-900/30 via-[#181b21] to-emerald-950/20 rounded-2xl border border-emerald-500/20 p-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Leaf className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white">
                    Plant Health Scanner
                  </h1>
                  <p className="text-emerald-400/80 text-sm mt-1">AI-Powered Analysis</p>
                </div>
              </div>
              <p className="text-gray-400 max-w-xl">
                Upload plant photos for instant AI-powered diagnosis. Identify diseases,
                nutrient deficiencies, and get personalized treatment recommendations.
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-500/20">
                <div className="text-2xl font-bold text-white">{images.length}</div>
                <div className="text-xs text-gray-400">Total Scans</div>
              </div>
              <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400">
                  {images.filter(img => img.status === 'Healthy').length}
                </div>
                <div className="text-xs text-gray-400">Healthy</div>
              </div>
              <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-orange-500/20">
                <div className="text-2xl font-bold text-orange-400">
                  {images.filter(img => img.status === 'Warning' || img.status === 'Critical').length}
                </div>
                <div className="text-xs text-gray-400">Need Care</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Upload Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative bg-[#181b21] rounded-2xl border-2 border-dashed p-8
              transition-all duration-300 cursor-pointer
              ${isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]'
                : 'border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-500/5'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />

            <AnimatePresence mode="wait">
              {!currentImage && !cameraActive ? (
                <motion.div
                  key="upload-prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <motion.div
                    animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-6 border border-emerald-500/30"
                  >
                    <Leaf className="w-12 h-12 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isDragging ? 'Drop your plant photo here' : 'Upload Plant Photo'}
                  </h3>
                  <p className="text-gray-400 text-center mb-6 max-w-md">
                    Drag and drop an image or click to browse. JPG, PNG up to 50MB.
                  </p>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </motion.button>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">or</span>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startCamera}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl flex items-center gap-2 border border-gray-600"
                    >
                      <Camera className="w-4 h-4" />
                      Use Camera
                    </motion.button>
                  </div>

                  {/* Camera mode selector */}
                  <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-800">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Camera Type:</span>
                    {[
                      { id: 'webcam', icon: Monitor, label: 'Webcam' },
                      { id: 'microscope', icon: Microscope, label: 'Microscope' },
                      { id: 'mobile', icon: Smartphone, label: 'Mobile' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setCameraMode(mode.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          cameraMode === mode.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <mode.icon className="w-3 h-3" />
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : cameraActive ? (
                <motion.div
                  key="camera-active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="relative bg-black rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-72 lg:h-80 object-contain"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1.5 bg-red-500/80 text-white text-xs font-bold rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        LIVE
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={capturePhoto}
                      className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Camera className="w-5 h-5" />
                      Capture
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stopCamera}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl border border-gray-600"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="image-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="relative bg-black rounded-xl overflow-hidden">
                    <img
                      src={currentImage}
                      alt="Captured plant"
                      className="w-full h-72 lg:h-80 object-contain"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <div className="text-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"
                          />
                          <p className="text-white font-medium">Analyzing...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentImage('')}
                      className="px-5 py-2.5 bg-red-900/50 hover:bg-red-900 text-red-300 font-medium rounded-xl flex items-center gap-2 border border-red-700/50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl flex items-center gap-2 border border-gray-600"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Change
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>

          {/* Analysis Progress (shown when analyzing) */}
          <AnimatePresence>
            {isAnalyzing && analysisStage !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#181b21] rounded-xl border border-emerald-500/20 p-6 overflow-hidden"
              >
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">
                  Analysis Progress
                </h3>
                <AnalysisProgress stage={analysisStage} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#181b21] rounded-2xl border border-gray-800 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-emerald-400" />
              Analysis Details
            </h3>

            <div className="space-y-5">
              {/* Strain Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Strain *</label>
                <select
                  value={formData.strain}
                  onChange={(e) => handleInputChange('strain', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Strain</option>
                  {strains.map(strain => (
                    <option key={strain.id} value={strain.name}>
                      {strain.name} ({strain.type})
                    </option>
                  ))}
                  <option value="unknown">Unknown Strain</option>
                </select>
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Observed Symptoms</label>
                <textarea
                  placeholder="Describe what you observe: yellowing leaves, spots, wilting, pests..."
                  value={formData.leafSymptoms}
                  onChange={(e) => handleInputChange('leafSymptoms', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all placeholder-gray-500"
                />
              </div>

              {/* Environmental Parameters */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">pH Level</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.5"
                    value={formData.phLevel}
                    onChange={(e) => handleInputChange('phLevel', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="72"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Humidity (%)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="55"
                    value={formData.humidity}
                    onChange={(e) => handleInputChange('humidity', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Growth Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Growth Stage</label>
                <div className="grid grid-cols-4 gap-2">
                  {['seedling', 'vegetative', 'flowering', 'harvest'].map(stage => (
                    <button
                      key={stage}
                      onClick={() => handleInputChange('growthStage', stage)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                        formData.growthStage === stage
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {/* Advanced Options */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4 border-t border-gray-800"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Growing Medium</label>
                        <select
                          value={formData.medium}
                          onChange={(e) => handleInputChange('medium', e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm"
                        >
                          <option value="soil">Soil</option>
                          <option value="hydroponic">Hydroponic</option>
                          <option value="coco">Coco Coir</option>
                          <option value="aeroponic">Aeroponic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Urgency</label>
                        <select
                          value={formData.urgency}
                          onChange={(e) => handleInputChange('urgency', e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnalysis}
                  disabled={isAnalyzing || !formData.strain}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Analyze Plant
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetForm}
                  className="px-5 py-3.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors border border-gray-700"
                >
                  Reset
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Selected Image Analysis */}
          <AnimatePresence mode="wait">
            {selectedImage && (
              <motion.div
                key={selectedImage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#181b21] rounded-2xl border border-gray-800 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-emerald-400" />
                      Results
                    </h3>
                    <StatusPill status={selectedImage.status} />
                  </div>

                  <div className="space-y-4">
                    {/* Health Score Ring */}
                    {selectedImage.analysis && (
                      <div className="flex justify-center py-4">
                        <div className="text-center">
                          <HealthScoreRing score={selectedImage.analysis.healthScore} size="lg" />
                          <p className="text-xs text-gray-400 mt-2">Health Score</p>
                        </div>
                      </div>
                    )}

                    {/* Basic Info */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-sm text-gray-400">Strain</span>
                      <span className="text-sm font-medium text-white">{selectedImage.strain}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-sm text-gray-400">Batch</span>
                      <span className="text-xs font-mono text-gray-300">{selectedImage.batchId.slice(0, 12)}...</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-sm text-gray-400">Time</span>
                      <span className="text-sm text-white">{selectedImage.timestamp}</span>
                    </div>

                    {/* Analysis Details */}
                    {selectedImage.analysis && (
                      <div className="space-y-4 pt-2">
                        {/* Diagnosis */}
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagnosis</h4>
                          <p className="text-white font-medium">{selectedImage.analysis.diagnosis}</p>
                          {selectedImage.analysis.confidence && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-500">Confidence</span>
                                <span className="text-emerald-400 font-medium">{selectedImage.analysis.confidence}%</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${selectedImage.analysis.confidence}%` }}
                                  transition={{ duration: 1, delay: 0.3 }}
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recommendations */}
                        {selectedImage.analysis.recommendations?.immediate && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Immediate Actions</h4>
                            {selectedImage.analysis.recommendations.immediate.slice(0, 3).map((rec, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm text-gray-300 bg-red-900/20 rounded-lg p-3 border border-red-500/20">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                {rec}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                          <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            Report
                          </button>
                          <button
                            onClick={handleAnalysis}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Re-analyze
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Processing State */}
                    {selectedImage.status === 'Processing' && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="relative">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Leaf className="w-6 h-6 text-emerald-400" />
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">Analyzing plant health...</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#181b21] rounded-2xl border border-gray-800 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Recent Scans</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-sm text-gray-400">Total Scans</span>
                <span className="text-sm font-bold text-white">{images.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-sm text-gray-400">Healthy</span>
                <span className="text-sm font-bold text-emerald-400">
                  {images.filter(img => img.status === 'Healthy').length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-sm text-gray-400">Need Attention</span>
                <span className="text-sm font-bold text-orange-400">
                  {images.filter(img => img.status === 'Warning' || img.status === 'Critical').length}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recent Scans Grid */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Analysis History</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={viewMode === 'grid'
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
              : "space-y-3"
            }>
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: viewMode === 'grid' ? 1.03 : 1.01 }}
                  onClick={() => setSelectedId(image.id)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    selectedId === image.id
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-gray-800 hover:border-gray-600'
                  } bg-[#181b21]`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <img src={image.url} alt="Plant" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute inset-0 p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono text-gray-300 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            {image.timestamp}
                          </span>
                          {selectedId === image.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-3 h-3 bg-emerald-500 rounded-full"
                            />
                          )}
                        </div>
                        <div className="text-center">
                          <StatusPill status={image.status} />
                        </div>
                      </div>
                      {image.status === 'Processing' && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <img src={image.url} alt="Plant" className="w-20 h-20 rounded-lg object-cover" />
                      <div className="flex-1 flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium text-white">{image.strain}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{image.timestamp}</p>
                        </div>
                        <StatusPill status={image.status} />
                      </div>
                      {selectedId === image.id && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full" />
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedScanner;