import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Scan, Camera, FileText } from 'lucide-react';
import { api } from '../../lib/api';

interface PlantImage {
  id: string;
  url: string;
  timestamp: string;
  status: 'Processing' | 'Healthy' | 'Warning' | 'Critical';
  batchId?: string;
  strain?: string;
  analysis?: any;
}

const Scanner: React.FC = () => {
  const [images, setImages] = useState<PlantImage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = images.find(img => img.id === selectedId);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;

      const newImage: PlantImage = {
        id: Date.now().toString(),
        url: base64String,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Processing',
        batchId: '#452',
        strain: 'Gorilla Glue #4',
      };

      setImages(prev => [newImage, ...prev]);
      setSelectedId(newImage.id);
      setIsAnalyzing(true);

      try {
        const analysis = await api.analyzeSimple({
          image: base64String,
          strain: newImage.strain,
        });

        setImages(prev => prev.map(img => {
          if (img.id === newImage.id) {
            return {
              ...img,
              status: analysis.issues?.length > 0 ? 'Warning' : 'Healthy',
              analysis
            };
          }
          return img;
        }));
      } catch (error) {
        console.error('Analysis failed:', error);
        setImages(prev => prev.map(img => {
          if (img.id === newImage.id) {
            return { ...img, status: 'Critical' };
          }
          return img;
        }));
      } finally {
        setIsAnalyzing(false);
      }
    };

    reader.readAsDataURL(file);
  };

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

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Plant Health Scanner</h1>
        <p className="text-gray-400">Upload and analyze plant images for health issues</p>
      </div>

      {/* Upload Section */}
      <div className="mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Upload Plant Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
        />
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Scans</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image) => (
              <motion.div
                key={image.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedId(image.id)}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedId === image.id
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-gray-800 hover:border-gray-600'
                }`}
              >
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2" />
                    <span className="text-xs font-medium text-white">Processing</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Image Analysis */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#181b21] rounded-xl border border-gray-800 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image */}
            <div className="bg-black relative">
              <img
                src={selectedImage.url}
                alt="Selected Plant"
                className="w-full h-96 lg:h-full object-contain"
              />
            </div>

            {/* Analysis */}
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Analysis Results</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Status</h4>
                  <StatusPill status={selectedImage.status} />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Batch</h4>
                  <p className="text-white">{selectedImage.batchId}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Strain</h4>
                  <p className="text-white">{selectedImage.strain}</p>
                </div>

                {selectedImage.analysis && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Findings</h4>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-300">
                        {selectedImage.analysis.recommendations || 'Analysis complete'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Download Report
                  </button>
                  <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    <Scan className="w-4 h-4" />
                    Re-analyze
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Scanner;