import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { checkCameraSupport, getCameraDevices, capturePhotoFromVideo } from '../../lib/scanner-utils';

interface CameraCaptureProps {
  onPhotoCapture: (photoUrl: string) => void;
  onError: (error: string) => void;
  className?: string;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onPhotoCapture, onError, className = '' }) => {
  const [isActive, setIsActive] = useState(false);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    checkCameraDevices();
    return () => {
      stopCamera();
    };
  }, []);

  const checkCameraDevices = async () => {
    try {
      const support = checkCameraSupport();
      if (!support.supported) {
        onError(support.message);
        return;
      }

      const deviceList = await getCameraDevices();
      const cameraDevices = deviceList.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`
      }));

      setDevices(cameraDevices);
      if (cameraDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(cameraDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to check camera devices:', error);
      onError('Failed to access camera devices');
    }
  };

  const startCamera = async () => {
    if (!selectedDeviceId) {
      onError('No camera device selected');
      return;
    }

    setIsLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId,
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsActive(true);
    } catch (error) {
      console.error('Camera access failed:', error);
      onError('Failed to access camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) {
      onError('Camera not ready');
      return;
    }

    try {
      const capturedPhoto = await capturePhotoFromVideo(videoRef.current, 0.9);
      onPhotoCapture(capturedPhoto.dataUrl);
      stopCamera();
    } catch (error) {
      console.error('Failed to capture photo:', error);
      onError('Failed to capture photo');
    }
  };

  const switchCamera = () => {
    stopCamera();
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  useEffect(() => {
    if (isActive && selectedDeviceId) {
      startCamera();
    }
  }, [selectedDeviceId]);

  if (devices.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg p-8 text-center ${className}`}>
        <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No camera devices found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Device Selector */}
      {devices.length > 1 && (
        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      )}

      {/* Camera View */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
        {isActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ minHeight: '300px' }}
            />

            {/* Camera Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={capturePhoto}
                  disabled={isLoading}
                  className="w-16 h-16 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
                {devices.length > 1 && (
                  <button
                    onClick={switchCamera}
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
            <Camera className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-center mb-4">Camera preview</p>
            <button
              onClick={startCamera}
              disabled={isLoading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting Camera...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Start Camera
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Camera Info */}
      {isActive && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Camera active</span>
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <CameraOff className="w-4 h-4" />
            Stop Camera
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;