import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Sprout, Activity, Camera, ChevronRight } from 'lucide-react';

interface PlantAnalysisProps {
  plants?: any[];
  strains?: any[];
  onAnalyze?: (plantId: string) => void;
}

const PlantAnalysis: React.FC<PlantAnalysisProps> = ({ plants = [], strains = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 p-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-2xl p-8 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">AI Plant Analysis</h2>
            <p className="text-gray-400 max-w-xl">
              Upload plant photos for instant AI-powered diagnosis. Identify diseases,
              nutrient deficiencies, and get treatment recommendations from our vision model.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <Camera className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/scanner')}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all"
        >
          <ScanLine className="w-5 h-5" />
          Start New Analysis
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#181b21] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Plants</p>
              <p className="text-2xl font-bold text-white">{plants.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#181b21] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Strains Available</p>
              <p className="text-2xl font-bold text-white">{strains.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#181b21] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Analysis Feature</p>
              <p className="text-lg font-bold text-emerald-400">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/scanner')}
          className="bg-[#181b21] rounded-xl p-6 border border-gray-800 hover:border-emerald-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <ScanLine className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  Analyze Plant Photo
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Upload an image for instant AI diagnosis
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
          </div>
        </button>

        <button
          onClick={() => navigate('/plants')}
          className="bg-[#181b21] rounded-xl p-6 border border-gray-800 hover:border-blue-500/50 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Sprout className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                  View Plant Library
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Browse and manage your plant collection
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
          </div>
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/20">
        <p className="text-blue-300 text-sm">
          <strong>Tip:</strong> For best results, take photos in good lighting with the affected
          area clearly visible. Include both healthy and affected tissue when possible.
        </p>
      </div>
    </div>
  );
};

export default PlantAnalysis;