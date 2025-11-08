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
  Webcam
} from 'lucide-react';

interface LiveCameraProps {
  onImageCapture: (imageData: string, deviceInfo: any) => void;
  autoAnalyze?: boolean;
  analyzeInterval?: number; // seconds
  className?: string;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  capabilities: MediaTrackCapabilities;
}

export default function LiveCamera({
  onImageCapture,
  autoAnalyze = false,
  analyzeInterval = 30,
  className = ""
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
  const [analysisCountdown, setAnalysisCountdown] = useState<number>(0);
  const [cameraMode, setCameraMode] = useState<'webcam' | 'microscope'>('webcam');
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });

  // Get available video devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${devices.indexOf(device)}`,
          capabilities: (device as any).getCapabilities?.() || {}
        }));

      setDevices(videoDevices);

      // Auto-select first device if none selected
      if (!selectedDevice && videoDevices.length > 0) {
        // Check for microscope in device labels
        const microscopeDevice = videoDevices.find(d =>
          d.label.toLowerCase().includes('microscope') ||
          d.label.toLowerCase().includes('dino') ||
          d.label.toLowerCase().includes('jiusion')
        );

        if (microscopeDevice) {
          setSelectedDevice(microscopeDevice.deviceId);
          setCameraMode('microscope');
        } else {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      }
    } catch (err) {
      console.error('Error getting devices:', err);
      setError('Unable to access camera devices');
    }
  }, [selectedDevice]);

  // Start video stream
  const startStream = useCallback(async () => {
    try {
      setError('');

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          facingMode: 'environment', // Prefer back camera on mobile
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error('Error starting stream:', err);
      setError(err.message || 'Unable to access camera');
      setIsStreaming(false);
    }
  }, [selectedDevice, resolution]);

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

    // Get device info
    const deviceInfo = {
      deviceId: selectedDevice,
      label: devices.find(d => d.deviceId === selectedDevice)?.label || 'Unknown Camera',
      mode: cameraMode,
      resolution: {
        width: canvas.width,
        height: canvas.height
      },
      timestamp: new Date().toISOString(),
      format: 'live_capture'
    };

    return { imageData, deviceInfo };
  }, [isStreaming, selectedDevice, devices, cameraMode]);

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

  // Initialize devices on mount
  useEffect(() => {
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
      }
    }
  }, [selectedDevice, resolution, startStream, stopStream, isStreaming]);

  // Update resolution based on camera mode
  useEffect(() => {
    if (cameraMode === 'microscope') {
      setResolution({ width: 1920, height: 1080 });
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
              <div className="flex gap-2">
                <Button
                  variant={cameraMode === 'webcam' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCameraMode('webcam')}
                  disabled={isStreaming}
                  className="flex-1"
                >
                  <Webcam className="h-4 w-4 mr-2" />
                  Webcam
                </Button>
                <Button
                  variant={cameraMode === 'microscope' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCameraMode('microscope')}
                  disabled={isStreaming}
                  className="flex-1"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Microscope
                </Button>
              </div>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex flex-wrap gap-2">
            {!isStreaming ? (
              <Button onClick={startStream} className="flex-1 bg-green-600 hover:bg-green-500">
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
              disabled={!isStreaming || isAnalyzing}
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

            <Button
              onClick={() => getDevices()}
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
              />
              {isAnalyzing && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-blue-600 text-white animate-pulse">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Analyzing...
                  </Badge>
                </div>
              )}
              {cameraMode === 'microscope' && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-purple-600 text-white">
                    <Monitor className="h-3 w-3 mr-1" />
                    Microscope Mode
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}