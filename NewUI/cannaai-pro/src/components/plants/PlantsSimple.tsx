import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout, Plus, Search, Filter, Leaf, AlertTriangle, CheckCircle, Clock,
  TrendingUp, Droplet, Sun, Thermometer, ArrowRight, Camera, LeafIcon,
  ChevronRight, MoreVertical, Edit, Trash2, Eye, ScanLine, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mock plant data for demo
const mockPlants = [
  {
    id: '1',
    name: 'Blue Dream',
    strain: 'Sativa-dominant Hybrid',
    stage: 'flowering',
    healthScore: 87,
    lastWatered: '2 days ago',
    lightHours: 12,
    daysInCycle: 45,
    image: null
  },
  {
    id: '2',
    name: 'Purple Kush',
    strain: 'Indica',
    stage: 'vegetative',
    healthScore: 62,
    lastWatered: '1 day ago',
    lightHours: 18,
    daysInCycle: 28,
    image: null
  },
  {
    id: '3',
    name: 'GSC',
    strain: 'Hybrid',
    stage: 'seedling',
    healthScore: 91,
    lastWatered: '6 hours ago',
    lightHours: 24,
    daysInCycle: 12,
    image: null
  },
  {
    id: '4',
    name: 'OG Kush',
    strain: 'Indica-dominant Hybrid',
    stage: 'harvest-ready',
    healthScore: 95,
    lastWatered: '3 days ago',
    lightHours: 12,
    daysInCycle: 65,
    image: null
  }
];

// Growth stage config
const stageConfig = {
  seedling: { color: 'bg-emerald-400', label: 'Seedling', icon: '🌱' },
  vegetative: { color: 'bg-blue-400', label: 'Vegetative', icon: '🌿' },
  flowering: { color: 'bg-purple-400', label: 'Flowering', icon: '🌸' },
  'harvest-ready': { color: 'bg-amber-400', label: 'Harvest', icon: '🌾' }
};

// Health score badge component
const HealthBadge: React.FC<{ score: number }> = ({ score }) => {
  const getStatus = () => {
    if (score >= 80) return { label: 'Healthy', class: 'bg-emerald-900/80 text-emerald-300 border-emerald-600' };
    if (score >= 60) return { label: 'Fair', class: 'bg-yellow-900/80 text-yellow-300 border-yellow-600' };
    return { label: 'Needs Care', class: 'bg-red-900/80 text-red-300 border-red-600' };
  };

  const status = getStatus();

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${status.class}`}>
      {score}%
    </span>
  );
};

// Plant card component
const PlantCard: React.FC<{ plant: typeof mockPlants[0]; onAnalyze: () => void }> = ({ plant, onAnalyze }) => {
  const [showMenu, setShowMenu] = useState(false);
  const stage = stageConfig[plant.stage as keyof typeof stageConfig] || stageConfig.seedling;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-[#181b21] rounded-2xl border border-gray-800 overflow-hidden group hover:border-emerald-500/30 transition-all duration-300"
    >
      {/* Header with gradient */}
      <div className="h-24 bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 bg-black/30 backdrop-blur-sm rounded-lg hover:bg-black/50 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <LeafIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plant.name}</h3>
            <p className="text-xs text-emerald-300/70">{plant.strain}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Stage & Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{stage.icon}</span>
            <span className="text-sm font-medium text-gray-300">{stage.label}</span>
          </div>
          <HealthBadge score={plant.healthScore} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
            <Droplet className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Watered</p>
            <p className="text-sm font-medium text-white">{plant.lastWatered}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
            <Sun className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Light</p>
            <p className="text-sm font-medium text-white">{plant.lightHours}h</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
            <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Days</p>
            <p className="text-sm font-medium text-white">{plant.daysInCycle}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAnalyze}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <ScanLine className="w-4 h-4" />
            Analyze
          </motion.button>
          <button className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-all border border-gray-700">
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-4 top-16 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-10"
          >
            <button className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-2">
              <Activity className="w-4 h-4" /> View History
            </button>
            <button className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/30 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main component
const PlantsSimple: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const stats = {
    total: mockPlants.length,
    healthy: mockPlants.filter(p => p.healthScore >= 80).length,
    needsCare: mockPlants.filter(p => p.healthScore < 60).length,
    harvestReady: mockPlants.filter(p => p.stage === 'harvest-ready').length
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900/20 via-[#181b21] to-emerald-950/10 border-b border-emerald-500/20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sprout className="w-7 h-7 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Plant Library</h1>
                <p className="text-emerald-400/70 text-sm">Manage and monitor your cannabis collection</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-3">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-500/20">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400">{stats.healthy}</div>
                <div className="text-xs text-gray-400">Healthy</div>
              </div>
              <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-amber-500/20">
                <div className="text-2xl font-bold text-amber-400">{stats.harvestReady}</div>
                <div className="text-xs text-gray-400">Harvest Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Quick Action Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 rounded-2xl border border-emerald-500/30 p-6"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Analyze Plant Health</h3>
                <p className="text-sm text-gray-400">Upload a photo for AI-powered diagnosis</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/scanner')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <ScanLine className="w-5 h-5" />
              Start Analysis
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search plants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#181b21] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2.5 bg-[#181b21] border border-gray-800 rounded-xl text-gray-400 hover:text-white hover:border-gray-700 flex items-center gap-2 transition-all">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" />
              Add Plant
            </button>
          </div>
        </div>

        {/* Plant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockPlants
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((plant, index) => (
              <motion.div
                key={plant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PlantCard
                  plant={plant}
                  onAnalyze={() => navigate('/scanner')}
                />
              </motion.div>
            ))}
        </div>

        {/* Empty State */}
        {mockPlants.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Sprout className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No plants yet</h3>
            <p className="text-gray-400 mb-6">Add your first plant to start tracking its growth</p>
            <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Your First Plant
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PlantsSimple;