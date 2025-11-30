import React from 'react';
import { motion } from 'framer-motion';
import { Plant } from '../types';

// Import UI components
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Import icons
import {
  Sprout,
  Calendar,
  Heart,
  Activity,
  Edit,
  Trash2,
  Camera,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface PlantGridProps {
  plants: Plant[];
  onSelect: (plant: Plant) => void;
  onEdit: (plant: Plant) => void;
  onDelete: (plantId: string) => void;
  onAnalyze: (plantId: string) => void;
  isLoading?: boolean;
}

const PlantGrid: React.FC<PlantGridProps> = ({
  plants,
  onSelect,
  onEdit,
  onDelete,
  onAnalyze,
  isLoading = false
}) => {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthBadgeColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'good':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'fair':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'poor':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getStageColor = (stage: string) => {
    const stageColors = {
      germination: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      seedling: 'bg-green-500/10 text-green-400 border-green-500/30',
      vegetative: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'pre-flowering': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      flowering: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      ripening: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      harvesting: 'bg-red-500/10 text-red-400 border-red-500/30'
    };
    return stageColors[stage as keyof typeof stageColors] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  const getAgeInDays = (plantedDate: string) => {
    const planted = new Date(plantedDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - planted.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="bg-[#181b21] border border-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-32 bg-gray-800 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-800 rounded mb-2"></div>
            <div className="h-3 bg-gray-800 rounded mb-4"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-800 rounded flex-1"></div>
              <div className="h-6 bg-gray-800 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="text-center py-12">
        <Sprout className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">No plants found</h3>
        <p className="text-gray-500">Start by adding your first plant to track its growth and health.</p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {plants.map((plant, index) => (
        <motion.div
          key={plant.id}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card
            className={`group bg-[#181b21] border-gray-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-200 cursor-pointer ${
              !plant.isActive ? 'opacity-60' : ''
            }`}
            onClick={() => onSelect(plant)}
          >
            {/* Plant Image */}
            <div className="relative h-48 bg-gray-900 overflow-hidden">
              {plant.images && plant.images.length > 0 ? (
                <img
                  src={plant.images.find(img => img.isPrimary)?.url || plant.images[0].url}
                  alt={plant.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Sprout className="w-12 h-12 text-gray-700" />
                </div>
              )}

              {/* Health Score Overlay */}
              <div className="absolute top-2 right-2 bg-black/70 rounded-lg px-2 py-1">
                <div className={`text-lg font-bold ${getHealthColor(plant.health.score)}`}>
                  {plant.health.score}%
                </div>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                <Badge className={getHealthBadgeColor(plant.health.status)}>
                  {plant.health.status}
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-black/70 hover:bg-black/90 text-white p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze(plant.id);
                  }}
                >
                  <Activity className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-black/70 hover:bg-black/90 text-white p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(plant);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-red-900/70 hover:bg-red-900/90 text-white p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(plant.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Plant Info */}
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {plant.name}
                </h3>
                {plant.issues && plant.issues.length > 0 && (
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 ml-2" />
                )}
              </div>

              <p className="text-sm text-gray-400 mb-3">{plant.strain?.name || 'Unknown Strain'}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={getStageColor(plant.stage)}>
                  {plant.stage.replace('-', ' ')}
                </Badge>
                <Badge variant="outline" className="border-gray-700 text-gray-400">
                  {getAgeInDays(plant.plantedDate)} days
                </Badge>
              </div>

              {/* Health Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Health Score</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-800 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${
                          plant.health.score >= 80 ? 'bg-emerald-500' :
                          plant.health.score >= 60 ? 'bg-yellow-500' :
                          plant.health.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${plant.health.score}%` }}
                      ></div>
                    </div>
                    <Heart className={`w-3 h-3 ${getHealthColor(plant.health.score)}`} />
                  </div>
                </div>

                {plant.location && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {plant.location.name}
                  </div>
                )}

                {plant.tags && plant.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {plant.tags.slice(0, 2).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {plant.tags.length > 2 && (
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">
                        +{plant.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!plant.isActive && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <span className="text-xs text-gray-500">Archived</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default PlantGrid;