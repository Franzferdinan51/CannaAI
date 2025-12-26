'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  CameraOff,
  Video,
  VideoOff,
  RefreshCw,
  Zap,
  AlertCircle,
  Monitor,
  Camera as CameraIcon,
  Webcam,
  Smartphone,
  Microscope,
  Sparkles,
  Settings,
  Move,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Square,
  Circle
} from 'lucide-react';

interface LiveCameraProps {
  onImageCapture: (imageData: string, deviceInfo: any) => void;
  onTrichomeAnalysis?: (imageData: string, deviceInfo: any) => void;
  autoAnalyze?: boolean;
  analyzeInterval?: number; // seconds
  className?: string;
  enableTrichomeMode?: boolean;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  capabilities: MediaTrackCapabilities;
  isMobile?: boolean;
  magnification?: number;
}

export default function LiveCamera({
  onImageCapture,
  onTrichomeAnalysis,
  autoAnalyze = false,
  analyzeInterval = 30,
  className = "",
  enableTrichomeMode = false
}: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  
  const [isStreaming, setIsStreaming] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTrichomeAnalyzing, setIsTrichomeAnalyzing] = useState(false);
  const [analysisCountdown, setAnalysisCountdown] = useState<number>(0);
  const [cameraMode, setCameraMode] = useState<'webcam' | 'microscope' | 'mobile'>('webcam');
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'general' | 'trichome'>('general');

  // Picture-in-Picture state
  const [showPiP, setShowPiP] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });
  const [pipSize, setPipSize] = useState({ width: 240, height: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pipShape, setPipShape] = useState<'square' | 'circle'>('square');
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  // Detect if running on mobile device
  const detectMobileDevice = useCallback(() => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      window.innerWidth <= 768;
    setIsMobileDevice(isMobile);

    if (isMobile) {
      // Default to mobile camera mode on mobile devices
      setCameraMode('mobile');
      setResolution({ width: 1920, height: 1080 }); // Mobile cameras usually have good resolution
    }
  }, []);

  // Get available video devices with enhanced detection
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => {
          const label = device.label || `Camera ${devices.indexOf(device)}`;
          const isMicroscope = label.toLowerCase().includes('microscope') ||
                             label.toLowerCase().includes('dino') ||
                             label.toLowerCase().includes('jiusion') ||
                             label.toLowerCase().includes('plugable');
          const isMobileCamera = label.toLowerCase().includes('back') ||
                                 label.toLowerCase().includes('camera') ||
                                 label.toLowerCase().includes('facing back');

          return {
            deviceId: device.deviceId,
            label: label,
            capabilities: (device as any).getCapabilities?.() || {},
            isMobile: isMobileCamera || isMobileDevice,
            magnification: isMicroscope ? 200 : (isMobileCamera ? 100 : 1)
          };
        });

      setDevices(videoDevices);

      // Smart device selection
      if (!selectedDevice && videoDevices.length > 0) {
        let preferredDevice: any = null;

        // Priority order: Microscope > Mobile Back Camera > Any Camera
        if (isMobileDevice) {
          preferredDevice = videoDevices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('camera 0')
          ) || videoDevices[0];
          setCameraMode('mobile');
        } else {
          preferredDevice = videoDevices.find(d => d.isMicroscope) ||
                           videoDevices.find(d => d.label.toLowerCase().includes('back')) ||
                           videoDevices[0];

          if (preferredDevice?.isMicroscope) {
            setCameraMode('microscope');
          }
        }

        if (preferredDevice) {
          setSelectedDevice(preferredDevice.deviceId);
        }
      }
    } catch (err) {
      console.error('Error getting devices:', err);
      setError('Unable to access camera devices');
    }
  }, [selectedDevice, isMobileDevice]);

  // Start video stream with fallback mechanism
  const startStream = useCallback(async () => {
    const attemptStream = async (constraints: MediaStreamConstraints, attemptName: string): Promise<MediaStream> => {
      console.log(`Attempt ${attemptName}:`, constraints);
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.error(`Attempt ${attemptName} failed:`, err);
        throw err;
      }
    };

    try {
      setError('');

      // Strategy 1: Try with exact device constraints
      let constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: resolution.width, min: 320 },
          height: { ideal: resolution.height, min: 240 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      if (selectedDevice) {
        constraints.video = {
          ...constraints.video,
          deviceId: { exact: selectedDevice }
        };
      }

      if (isMobileDevice) {
        constraints.video = {
          ...constraints.video,
          facingMode: 'environment'
        };
      }

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      // Attempt 1: Exact constraints
      try {
        stream = await attemptStream(constraints, 'Exact constraints');
      } catch (err) {
        lastError = err as Error;

        // Attempt 2: Fallback without exact device ID
        console.log('Fallback: Trying without exact device ID');
        const fallbackConstraints = {
          video: {
            width: { ideal: resolution.width, min: 320 },
            height: { ideal: resolution.height, min: 240 },
            frameRate: { ideal: 30 }
          },
          audio: false
        };

        if (isMobileDevice) {
          fallbackConstraints.video = {
            ...fallbackConstraints.video,
            facingMode: 'environment'
          };
        }

        try {
          stream = await attemptStream(fallbackConstraints, 'Fallback constraints');
        } catch (fallbackErr) {
          lastError = fallbackErr as Error;

          // Attempt 3: Basic constraints for maximum compatibility
          console.log('Fallback: Trying basic constraints');
          const basicConstraints = {
            video: true,
            audio: false
          };

          try {
            stream = await attemptStream(basicConstraints, 'Basic constraints');
          } catch (basicErr) {
            lastError = basicErr as Error;
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to obtain video stream');
      }

      // Verify the stream has video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video tracks found in stream');
      }

      console.log('Stream obtained successfully:', {
        trackCount: videoTracks.length,
        trackSettings: videoTracks[0].getSettings(),
        trackCapabilities: videoTracks[0].getCapabilities?.()
      });

          // Enhanced video element binding with retry mechanism
      const bindStreamToVideo = async (stream: MediaStream, retries = 3): Promise<void> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          console.log(`Video binding attempt ${attempt}/${retries}`);

          // Wait for video element to be available with better timing
          let attempts = 0;
          let maxAttempts = 30; // Increased attempts
          while (!videoRef.current && attempts < maxAttempts) {
            console.log(`Waiting for video element... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced wait time
            attempts++;

            // Force a re-render if needed
            if (attempts === 10) {
              // Trigger a small state change to force re-render
              setStreamStatus(prev => prev);
            }
          }

          if (!videoRef.current) {
            throw new Error(`Video element reference is null after ${maxAttempts} attempts. Component may not have mounted properly.`);
          }

          const videoElement = videoRef.current;
          console.log('Video element found, attempting to bind stream');

          try {
            // Clear any existing stream
            if (videoElement.srcObject) {
              const oldStream = videoElement.srcObject as MediaStream;
              oldStream.getTracks().forEach(track => track.stop());
            }

            // Set up video element event handlers before binding
            videoElement.onloadedmetadata = () => {
              console.log('Video metadata loaded successfully');
              videoElement.play().catch(playError => {
                console.error('Video play failed:', playError);
                setError('Video playback failed: ' + playError.message);
              });
            };

            videoElement.onerror = (event) => {
              console.error('Video element error:', event);
              setError('Video element error occurred');
              setIsStreaming(false);
            };

            videoElement.oncanplay = () => {
              console.log('Video can play');
            };

            // Bind the stream
            videoElement.srcObject = stream;
            streamRef.current = stream;

            // Wait a bit for the stream to bind
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify the stream is bound
            if (videoElement.srcObject === stream) {
              console.log('Stream bound to video element successfully');
              setIsStreaming(true);
              return; // Success!
            } else {
              throw new Error('Stream binding verification failed');
            }

          } catch (error) {
            console.error(`Video binding attempt ${attempt} failed:`, error);
            if (attempt === retries) {
              throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      };

      try {
        await bindStreamToVideo(stream, 3);
        console.log('Video stream binding completed successfully');
      } catch (videoError) {
        console.error('Failed to bind stream to video element after all attempts:', videoError);
        // Stop the stream since we can't bind it
        stream.getTracks().forEach(track => track.stop());
        throw videoError;
      }
    } catch (err: any) {
      console.error('All stream attempts failed:', err);

      // Provide user-friendly error messages
      let userMessage = err.message || 'Unable to access camera';
      if (err.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera device.';
      } else if (err.name === 'NotReadableError') {
        userMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        userMessage = 'Camera constraints not supported. Try refreshing devices.';
      } else if (err.name === 'NotSupportedError') {
        userMessage = 'Camera not supported on this device/browser.';
      }

      setError(userMessage);
      setIsStreaming(false);

      // Clean up any partial stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [selectedDevice, resolution, isMobileDevice, isStreaming]);

  // Stop video stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsStreaming(false);
    setAnalysisCountdown(0);
  }, []);

  // Capture image from video stream
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    const selectedDeviceInfo = devices.find(d => d.deviceId === selectedDevice);

    // Get device info
    const deviceInfo = {
      deviceId: selectedDevice,
      label: selectedDeviceInfo?.label || 'Unknown Camera',
      mode: cameraMode,
      resolution: {
        width: canvas.width,
        height: canvas.height
      },
      timestamp: new Date().toISOString(),
      format: 'live_capture',
      magnification: selectedDeviceInfo?.magnification || 1,
      deviceType: cameraMode === 'mobile' ? 'Mobile Phone Camera' :
                  cameraMode === 'microscope' ? 'USB Microscope' : 'USB Webcam',
      isMobile: selectedDeviceInfo?.isMobile || false
    };

    return { imageData, deviceInfo };
  }, [isStreaming, selectedDevice, devices, cameraMode]);

  // Picture-in-Picture functionality
  const handlePiPMouseDown = useCallback((e: React.MouseEvent, action: 'drag' | 'resize') => {
    e.preventDefault();
    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPipPosition(prev => ({
        x: Math.max(0, Math.min(window.innerWidth - pipSize.width, prev.x + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - pipSize.height, prev.y + deltaY))
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPipSize(prev => ({
        width: Math.max(120, Math.min(400, prev.width + deltaX)),
        height: Math.max(90, Math.min(300, prev.height + deltaY))
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, dragStart, pipSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Sync PiP video with main video
  useEffect(() => {
    if (pipVideoRef.current && videoRef.current && streamRef.current) {
      // Clone the stream for the PiP video
      pipVideoRef.current.srcObject = streamRef.current;
    }
  }, [isStreaming, showPiP]);

  // Mouse event listeners for dragging and resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Toggle PiP visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowPiP(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Perform trichome analysis
  const performTrichomeAnalysis = useCallback(async () => {
    const result = captureImage();
    if (result && onTrichomeAnalysis) {
      setIsTrichomeAnalyzing(true);
      try {
        await onTrichomeAnalysis(result.imageData, result.deviceInfo);
      } finally {
        setIsTrichomeAnalyzing(false);
      }
    }
  }, [captureImage, onTrichomeAnalysis]);

  // Manual capture and analyze
  const handleManualCapture = useCallback(() => {
    const result = captureImage();
    if (result) {
      onImageCapture(result.imageData, result.deviceInfo);
      setIsAnalyzing(true);
      setTimeout(() => setIsAnalyzing(false), 2000);
    }
  }, [captureImage, onImageCapture]);

  // Auto-analyze functionality
  useEffect(() => {
    if (autoAnalyze && isStreaming && analyzeInterval > 0) {
      setAnalysisCountdown(analyzeInterval);

      intervalRef.current = setInterval(() => {
        setAnalysisCountdown(prev => {
          if (prev <= 1) {
            const result = captureImage();
            if (result) {
              onImageCapture(result.imageData, result.deviceInfo);
              setIsAnalyzing(true);
              setTimeout(() => setIsAnalyzing(false), 2000);
            }
            return analyzeInterval;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setAnalysisCountdown(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoAnalyze, isStreaming, analyzeInterval, captureImage, onImageCapture]);

  
  // Initialize on mount
  useEffect(() => {
    detectMobileDevice();
    getDevices();

    return () => {
      stopStream();
    };
  }, []);

  // Start stream when device or resolution changes
  useEffect(() => {
    if (selectedDevice) {
      if (isStreaming) {
        stopStream();
        setTimeout(() => startStream(), 100);
      } else {
        // Start stream for the first time
        startStream();
      }
    }
  }, [selectedDevice, resolution, startStream, stopStream, isStreaming]);

  // Update resolution based on camera mode
  useEffect(() => {
    if (cameraMode === 'microscope') {
      setResolution({ width: 2048, height: 1536 }); // Higher for trichomes
    } else if (cameraMode === 'mobile') {
      setResolution({ width: 1920, height: 1080 }); // Mobile cameras usually have good resolution
    } else {
      setResolution({ width: 1280, height: 720 });
    }
  }, [cameraMode]);

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert className="border-red-600 bg-red-950/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Camera Controls */}
      <Card className="bg-slate-800/50 border-slate-600">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-slate-200">
            <Camera className="h-5 w-5 mr-2" />
            Live Camera Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Camera Device
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200"
                disabled={isStreaming}
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Camera Mode
              </label>
              <div className={`flex gap-2 ${isMobileDevice ? 'flex-col' : ''}`}>
                <Button
                  variant={cameraMode === 'webcam' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCameraMode('webcam')}
                  disabled={isStreaming}
                  className={`${isMobileDevice ? 'w-full' : 'flex-1'}`}
                >
                  <Webcam className="h-4 w-4 mr-2" />
                  Webcam
                </Button>
                <Button
                  variant={cameraMode === 'microscope' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCameraMode('microscope')}
                  disabled={isStreaming}
                  className={`${isMobileDevice ? 'w-full' : 'flex-1'}`}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Microscope
                </Button>
                {isMobileDevice && (
                  <Button
                    variant={cameraMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCameraMode('mobile')}
                    disabled={isStreaming}
                    className="w-full"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile Camera
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex flex-wrap gap-2">
            {!isStreaming ? (
              <Button
                onClick={startStream}
                className="flex-1 bg-green-600 hover:bg-green-500"
                disabled={!selectedDevice}
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopStream} variant="destructive" className="flex-1">
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Camera
              </Button>
            )}

            <Button
              onClick={handleManualCapture}
              disabled={!isStreaming || isAnalyzing || isTrichomeAnalyzing}
              className="flex-1 bg-blue-600 hover:bg-blue-500"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Capture & Analyze
                </>
              )}
            </Button>

            {/* Trichome Analysis Button */}
            {enableTrichomeMode && (cameraMode === 'microscope' || (isMobileDevice && cameraMode === 'mobile')) && (
              <Button
                onClick={performTrichomeAnalysis}
                disabled={!isStreaming || isAnalyzing || isTrichomeAnalyzing}
                className="flex-1 bg-purple-600 hover:bg-purple-500"
              >
                {isTrichomeAnalyzing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Analyzing Trichomes...
                  </>
                ) : (
                  <>
                    <Microscope className="h-4 w-4 mr-2" />
                    Trichome Analysis
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={() => getDevices()}
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {/* Picture-in-Picture Toggle */}
            {isStreaming && (
              <Button
                onClick={() => setShowPiP(!showPiP)}
                variant={showPiP ? 'default' : 'outline'}
                className={showPiP ? 'bg-blue-600 hover:bg-blue-500' : 'border-slate-600 text-slate-300'}
              >
                {showPiP ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide PiP
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show PiP
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Auto-Analyze Controls */}
          <div className="p-4 bg-slate-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Auto Analyze
              </label>
              <Button
                variant={autoAnalyze ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoAnalyze(!autoAnalyze)}
                disabled={!isStreaming}
              >
                {autoAnalyze ? (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Active
                  </>
                ) : (
                  <>
                    <VideoOff className="h-4 w-4 mr-2" />
                    Disabled
                  </>
                )}
              </Button>
            </div>

            {autoAnalyze && isStreaming && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Next analysis in:</span>
                  <Badge variant="outline" className="border-blue-600 text-blue-400">
                    {analysisCountdown}s
                  </Badge>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((analyzeInterval - analysisCountdown) / analyzeInterval) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {autoAnalyze && (
              <div className="mt-2">
                <label className="text-sm text-slate-400">Interval (seconds):</label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={analyzeInterval}
                  onChange={(e) => setAnalyzeInterval(parseInt(e.target.value))}
                  className="w-full mt-1"
                  disabled={isStreaming}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>10s</span>
                  <span>{analyzeInterval}s</span>
                  <span>5min</span>
                </div>
              </div>
            )}
          </div>

          {/* Device Status */}
          {isStreaming && (
            <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-800/30">
              <span className="text-green-400 text-sm flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                {devices.find(d => d.deviceId === selectedDevice)?.label || 'Camera Active'}
              </span>
              <Badge variant="outline" className="border-green-600 text-green-400">
                {resolution.width}x{resolution.height}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

  
      {/* Video Preview */}
      {isStreaming && (
        <Card className="bg-slate-800/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden bg-black" style={{ minHeight: '240px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-w-full"
                style={{
                  minHeight: '240px',
                  objectFit: 'contain',
                  display: 'block'
                }}
                suppressHydrationWarning={true}
              />
              {isTrichomeAnalyzing && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-purple-600 text-white animate-pulse">
                    <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                    Analyzing Trichomes...
                  </Badge>
                </div>
              )}
              {isAnalyzing && !isTrichomeAnalyzing && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-blue-600 text-white animate-pulse">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Analyzing...
                  </Badge>
                </div>
              )}

              {/* Device Mode Indicators */}
              <div className="absolute top-2 left-2 space-y-1">
                {cameraMode === 'microscope' && (
                  <Badge className="bg-purple-600 text-white">
                    <Monitor className="h-3 w-3 mr-1" />
                    Microscope Mode
                  </Badge>
                )}
                {isMobileDevice && cameraMode === 'mobile' && (
                  <Badge className="bg-green-600 text-white">
                    <Camera className="h-3 w-3 mr-1" />
                    Mobile Camera
                  </Badge>
                )}
                {enableTrichomeMode && (cameraMode === 'microscope' || (isMobileDevice && cameraMode === 'mobile')) && (
                  <Badge className="bg-pink-600 text-white">
                    <Microscope className="h-3 w-3 mr-1" />
                    Trichome Ready
                  </Badge>
                )}
              </div>

              {/* Device Info Overlay */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isMobileDevice && (
                    <Badge variant="outline" className="border-green-600 text-green-400 text-xs">
                      Mobile Device
                    </Badge>
                  )}
                  {cameraMode === 'microscope' && (
                    <Badge variant="outline" className="border-purple-600 text-purple-400 text-xs">
                      {devices.find(d => d.deviceId === selectedDevice)?.magnification || 200}x Magnification
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                  {resolution.width}x{resolution.height}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel - Only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-slate-800/50 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400 space-y-2">
            <div>
              <strong>Is Mobile:</strong> {isMobileDevice ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Is Streaming:</strong> {isStreaming ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Camera Mode:</strong> {cameraMode}
            </div>
            <div>
              <strong>Selected Device:</strong> {selectedDevice || 'None'}
            </div>
            <div>
              <strong>Resolution:</strong> {resolution.width}x{resolution.height}
            </div>
            <div>
              <strong>Available Devices:</strong> {devices.length}
            </div>
              {devices.length > 0 && (
              <div className="mt-2">
                <strong>Device List:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  {devices.map((device, index) => (
                    <li key={device.deviceId}>
                      {index + 1}. {device.label}
                      {device.isMobile && ' (Mobile)'}
                      {device.magnification > 1 && ` (${device.magnification}x)`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {videoRef.current && (
              <div className="mt-2">
                <strong>Video Element:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>Video Width: {videoRef.current.videoWidth || 'N/A'}</li>
                  <li>Video Height: {videoRef.current.videoHeight || 'N/A'}</li>
                  <li>Ready State: {videoRef.current.readyState}</li>
                  <li>Paused: {videoRef.current.paused ? 'Yes' : 'No'}</li>
                  <li>Current Time: {videoRef.current.currentTime}s</li>
                </ul>
              </div>
            )}
            {error && (
              <div className="mt-2 p-2 bg-red-900/50 rounded text-red-400">
                <strong>Error:</strong> {error}
              </div>
            )}
            <div className="mt-2">
              <Button
                onClick={() => {
                  console.log('=== DEBUG INFO ===');
                  console.log('Is Mobile:', isMobileDevice);
                  console.log('Is Streaming:', isStreaming);
                  console.log('Camera Mode:', cameraMode);
                  console.log('Selected Device:', selectedDevice);
                  console.log('Devices:', devices);
                  console.log('Video Element:', videoRef.current);
                  console.log('Stream:', streamRef.current);
                  if (videoRef.current) {
                    console.log('Video Properties:', {
                      videoWidth: videoRef.current.videoWidth,
                      videoHeight: videoRef.current.videoHeight,
                      readyState: videoRef.current.readyState,
                      paused: videoRef.current.paused,
                      currentTime: videoRef.current.currentTime
                    });
                  }
                  if (streamRef.current) {
                    const tracks = streamRef.current.getVideoTracks();
                    console.log('Stream Tracks:', tracks.map(t => ({
                      id: t.id,
                      label: t.label,
                      enabled: t.enabled,
                      muted: t.muted,
                      readyState: t.readyState,
                      settings: t.getSettings()
                    })));
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full border-slate-600 text-slate-300"
              >
                Log Debug Info to Console
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Picture-in-Picture Preview Window */}
      {showPiP && isStreaming && (
        <div
          className="fixed z-50 bg-slate-900 border-2 border-blue-500 rounded-lg shadow-2xl overflow-hidden"
          style={{
            left: `${pipPosition.x}px`,
            top: `${pipPosition.y}px`,
            width: `${pipSize.width}px`,
            height: `${pipSize.height}px`,
            borderRadius: pipShape === 'circle' ? '50%' : '8px',
            transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-out'
          }}
        >
          {/* Drag Handle */}
          <div
            className="absolute top-0 left-0 right-0 h-6 bg-blue-600 bg-opacity-80 cursor-move flex items-center justify-between px-2 z-10"
            onMouseDown={(e) => handlePiPMouseDown(e, 'drag')}
            style={{ borderRadius: pipShape === 'circle' ? '8px 8px 0 0' : '4px 4px 0 0' }}
          >
            <div className="flex items-center space-x-1">
              <Move className="h-3 w-3 text-white" />
              <span className="text-xs text-white font-medium">PiP Camera</span>
            </div>
            <div className="flex items-center space-x-1">
              {/* Shape Toggle */}
              <button
                onClick={() => setPipShape(pipShape === 'square' ? 'circle' : 'square')}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title={`Switch to ${pipShape === 'square' ? 'circle' : 'square'} shape`}
              >
                {pipShape === 'square' ? (
                  <Circle className="h-3 w-3 text-white" />
                ) : (
                  <Square className="h-3 w-3 text-white" />
                )}
              </button>
              {/* Close Button */}
              <button
                onClick={() => setShowPiP(false)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title="Close PiP"
              >
                <EyeOff className="h-3 w-3 text-white" />
              </button>
            </div>
          </div>

          {/* Video Element */}
          <div className="relative w-full h-full bg-black" style={{ paddingTop: '24px' }}>
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: pipShape === 'circle' ? 'scale(1.2)' : 'scale(1)',
                borderRadius: pipShape === 'circle' ? '50%' : '0'
              }}
            />

            {/* Status Indicators Overlay */}
            <div className="absolute top-8 left-2 right-2 space-y-1">
              {isTrichomeAnalyzing && (
                <Badge className="bg-purple-600 text-white text-xs animate-pulse w-full justify-center">
                  <Sparkles className="h-2 w-2 mr-1 animate-pulse" />
                  Trichomes
                </Badge>
              )}
              {isAnalyzing && !isTrichomeAnalyzing && (
                <Badge className="bg-blue-600 text-white text-xs animate-pulse w-full justify-center">
                  <RefreshCw className="h-2 w-2 mr-1 animate-spin" />
                  Analyzing
                </Badge>
              )}
            </div>

            {/* Camera Mode Indicator */}
            <div className="absolute bottom-2 left-2">
              <Badge
                className="text-xs"
                variant={cameraMode === 'microscope' ? 'default' : 'secondary'}
              >
                {cameraMode === 'microscope' && <Monitor className="h-2 w-2 mr-1" />}
                {cameraMode === 'mobile' && <Camera className="h-2 w-2 mr-1" />}
                {cameraMode === 'webcam' && <Webcam className="h-2 w-2 mr-1" />}
                {cameraMode.charAt(0).toUpperCase() + cameraMode.slice(1)}
              </Badge>
            </div>

            {/* Resolution Badge */}
            <div className="absolute bottom-2 right-2">
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {pipSize.width}x{Math.round(pipSize.width * 0.75)}
              </Badge>
            </div>

            {/* Recording Indicator */}
            <div className="absolute top-8 right-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-500 font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize opacity-60 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => handlePiPMouseDown(e, 'resize')}
            style={{ borderRadius: pipShape === 'circle' ? '0 0 8px 0' : '0 0 4px 0' }}
          >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white" />
          </div>
        </div>
      )}

      {/* PiP Helper Tooltip */}
      {showPiP && isStreaming && (
        <div className="fixed bottom-4 left-4 bg-slate-800 border border-slate-600 rounded-lg p-3 z-40 max-w-xs">
          <div className="text-xs text-slate-300 space-y-1">
            <div className="font-medium text-blue-400">Picture-in-Picture Controls:</div>
            <div>• Drag header to move window</div>
            <div>• Drag corner to resize</div>
            <div>• Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-200">Ctrl+P</kbd> to toggle</div>
            <div>• Click shape button to change style</div>
          </div>
        </div>
      )}
    </div>
  );
}