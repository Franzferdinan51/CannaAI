'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Usb,
  Camera,
  Monitor,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Zap,
  Webcam,
  Microscope
} from 'lucide-react';

interface USBDevice {
  id: string;
  name: string;
  type: 'webcam' | 'microscope';
  vendor: string;
  model: string;
  capabilities: {
    resolutions: string[];
    maxFPS: number;
    features: string[];
  };
  status: 'connected' | 'disconnected' | 'error';
  recommendedSettings?: {
    resolution: string;
    fps: number;
    focus: 'auto' | 'manual';
    brightness?: number;
    contrast?: number;
  };
}

interface USBDeviceConfigProps {
  onDeviceSelect: (device: USBDevice) => void;
  selectedDevice?: USBDevice;
}

export default function USBDeviceConfig({ onDeviceSelect, selectedDevice }: USBDeviceConfigProps) {
  const [devices, setDevices] = useState<USBDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');

  // USB Webcam and Microscope database
  const deviceDatabase = {
    webcams: [
      {
        vendor: 'Logitech',
        models: ['C920', 'C922', 'C310', 'C270', 'Brio', 'StreamCam'],
        capabilities: ['HD', 'Autofocus', 'Low-light correction']
      },
      {
        vendor: 'Microsoft',
        models: ['LifeCam HD-3000', 'LifeCam Studio', 'LifeCam Cinema'],
        capabilities: ['HD', 'TrueColor', 'Noise cancellation']
      },
      {
        vendor: 'Razer',
        models: ['Kiyo', 'Kiyo Pro'],
        capabilities: ['Ring light', 'HDR', 'Autofocus']
      },
      {
        vendor: 'Anker',
        models: ['PowerConf C200', 'PowerConf C300'],
        capabilities: ['AI-powered', 'Wide-angle', 'Low-light']
      }
    ],
    microscopes: [
      {
        vendor: 'Dino-Lite',
        models: ['AM4113ZT', 'AM4515ZT', 'AM7315MZT', 'AM7915MZT'],
        capabilities: ['Polarization', 'EDOF', 'Micro-touch', 'LED control']
      },
      {
        vendor: 'Jiusion',
        models: ['40x1000x', '2MP', '1080P', 'WiFi Handheld'],
        capabilities: ['LED lights', 'Stand included', 'Portable']
      },
      {
        vendor: 'Plugable',
        models: ['USB2-MICRO-250X', 'USB-MICRO-800X'],
        capabilities: ['Adjustable LED', 'Metal stand', 'Calibration']
      },
      {
        vendor: 'Koolertron',
        models: ['Digital Microscope', 'WiFi Microscope'],
        capabilities: ['8 LED lights', 'Metal stand', 'Measurement tools']
      }
    ]
  };

  // Scan for USB devices
  const scanDevices = async () => {
    setIsScanning(true);
    setError('');

    try {
      // Request camera permissions first
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => stream.getTracks().forEach(track => track.stop()))
        .catch(err => {
          throw new Error('Camera access denied. Please allow camera permissions.');
        });

      // Get video devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');

      // Map devices with enhanced detection
      const detectedDevices: USBDevice[] = videoDevices.map((device, index) => {
        const label = device.label.toLowerCase();
        const groupId = (device as any).groupId || '';
        const deviceId = device.deviceId;

        // Enhanced device detection
        let deviceType: 'webcam' | 'microscope' = 'webcam';
        let vendor = 'Unknown';
        let model = 'Unknown';
        let capabilities = {
          resolutions: ['640x480', '1280x720', '1920x1080'],
          maxFPS: 30,
          features: ['Basic video capture']
        };

        // Microscope detection patterns
        if (label.includes('microscope') ||
            label.includes('dino') ||
            label.includes('jiusion') ||
            label.includes('plugable') ||
            label.includes('koolertron') ||
            label.includes('digital microscope') ||
            label.includes('usb microscope')) {
          deviceType = 'microscope';

          // Identify specific microscope brands
          if (label.includes('dino')) {
            vendor = 'Dino-Lite';
            model = 'Professional Series';
            capabilities = {
              resolutions: ['640x480', '1280x720', '1920x1080', '2592x1944'],
              maxFPS: 30,
              features: ['Polarization', 'EDOF', 'LED Control', 'Measurement']
            };
          } else if (label.includes('jiusion')) {
            vendor = 'Jiusion';
            model = 'Handheld Series';
            capabilities = {
              resolutions: ['640x480', '1280x720', '1920x1080'],
              maxFPS: 30,
              features: ['LED Lights', 'Portable', 'Adjustable Focus']
            };
          }
        }
        // Webcam detection patterns
        else if (label.includes('logitech')) {
          vendor = 'Logitech';
          if (label.includes('c920') || label.includes('c922')) {
            model = 'C920/C922';
            capabilities = {
              resolutions: ['640x480', '1280x720', '1920x1080'],
              maxFPS: 30,
              features: ['HD', 'Autofocus', 'Low-light Correction', 'Wide-angle']
            };
          }
        } else if (label.includes('microsoft')) {
          vendor = 'Microsoft';
          if (label.includes('lifecam')) {
            model = 'LifeCam Series';
            capabilities = {
              resolutions: ['640x480', '1280x720', '1920x1080'],
              maxFPS: 30,
              features: ['HD', 'TrueColor Technology', 'Noise Reduction']
            };
          }
        } else if (label.includes('razer') || label.includes('kiyo')) {
          vendor = 'Razer';
          model = 'Kiyo Series';
          capabilities = {
            resolutions: ['640x480', '1280x720', '1920x1080'],
            maxFPS: 30,
            features: ['Ring Light', 'HDR', 'Autofocus', 'Stream-optimized']
          };
        }

        return {
          id: deviceId,
          name: device.label || `Camera ${index + 1}`,
          type: deviceType,
          vendor,
          model,
          capabilities,
          status: 'connected' as const,
          recommendedSettings: getRecommendedSettings(deviceType, capabilities)
        };
      });

      setDevices(detectedDevices);

      // Auto-select the best device
      if (detectedDevices.length > 0 && !selectedDevice) {
        // Prefer microscopes for plant analysis
        const microscope = detectedDevices.find(d => d.type === 'microscope');
        const bestDevice = microscope || detectedDevices[0];
        onDeviceSelect(bestDevice);
      }

    } catch (error: any) {
      console.error('Device scanning error:', error);
      setError(error.message || 'Failed to scan devices');
    } finally {
      setIsScanning(false);
    }
  };

  // Get recommended settings based on device type
  const getRecommendedSettings = (type: 'webcam' | 'microscope', capabilities: any) => {
    if (type === 'microscope') {
      return {
        resolution: capabilities.resolutions[capabilities.resolutions.length - 1] || '1920x1080', // Highest resolution
        fps: 15, // Lower FPS for better detail
        focus: 'manual' as const,
        brightness: 70,
        contrast: 80
      };
    } else {
      return {
        resolution: '1280x720', // Balanced quality and performance
        fps: 30, // Smooth video
        focus: 'auto' as const,
        brightness: 50,
        contrast: 50
      };
    }
  };

  // Initialize on mount
  useEffect(() => {
    scanDevices();
  }, []);

  return (
    <Card className="bg-slate-800/50 border-slate-600">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-slate-200">
          <span className="flex items-center">
            <Usb className="h-5 w-5 mr-2" />
            USB Device Configuration
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={scanDevices}
            disabled={isScanning}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Rescan'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-600 bg-red-950/50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Device List */}
        <div className="space-y-3">
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <Usb className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No USB cameras detected</p>
              <Button onClick={scanDevices} disabled={isScanning}>
                {isScanning ? 'Scanning...' : 'Scan for Devices'}
              </Button>
            </div>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedDevice?.id === device.id
                    ? 'bg-blue-900/30 border-blue-600'
                    : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                }`}
                onClick={() => onDeviceSelect(device)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      device.type === 'microscope'
                        ? 'bg-purple-900/50 text-purple-400'
                        : 'bg-blue-900/50 text-blue-400'
                    }`}>
                      {device.type === 'microscope' ? (
                        <Microscope className="h-5 w-5" />
                      ) : (
                        <Webcam className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-200">{device.name}</h4>
                      <p className="text-sm text-slate-400">{device.vendor} {device.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={`${
                      device.type === 'microscope'
                        ? 'border-purple-600 text-purple-400'
                        : 'border-blue-600 text-blue-400'
                    }`}>
                      {device.type === 'microscope' ? 'Microscope' : 'Webcam'}
                    </Badge>
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </div>

                {/* Device Capabilities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 mb-1">Resolutions:</p>
                    <p className="text-slate-300">{device.capabilities.resolutions.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Max FPS:</p>
                    <p className="text-slate-300">{device.capabilities.maxFPS} fps</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-slate-400 mb-1">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {device.capabilities.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="border-slate-600 text-slate-300 text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommended Settings */}
                {device.recommendedSettings && (
                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-sm font-medium text-slate-300 mb-2 flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Recommended Settings
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Resolution:</span>
                        <p className="text-slate-300">{device.recommendedSettings.resolution}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">FPS:</span>
                        <p className="text-slate-300">{device.recommendedSettings.fps}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Focus:</span>
                        <p className="text-slate-300 capitalize">{device.recommendedSettings.focus}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Brightness:</span>
                        <p className="text-slate-300">{device.recommendedSettings.brightness}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selection Indicator */}
                {selectedDevice?.id === device.id && (
                  <div className="mt-3 flex items-center text-blue-400 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Currently Selected
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Device Information */}
        <Alert className="border-blue-600 bg-blue-950/50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>USB Device Tips:</strong> For best results, use a USB microscope for detailed leaf analysis.
            Make sure your device has proper lighting and is positioned 2-6 inches from the plant surface.
            Enable autofocus for webcams or manual focus for microscopes.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}