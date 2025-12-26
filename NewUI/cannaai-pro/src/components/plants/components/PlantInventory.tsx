import React from 'react';
import { motion } from 'framer-motion';
import { PlantInventory as PlantInventoryType } from '../types';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Import icons
import {
  Sprout,
  AlertTriangle,
  TrendingUp,
  Activity,
  Heart,
  Calendar,
  MapPin,
  CheckSquare,
  Clock,
  Award,
  Target,
  Filter
} from 'lucide-react';

interface PlantInventoryProps {
  inventory: PlantInventoryType;
  detailed?: boolean;
}

const PlantInventory: React.FC<PlantInventoryProps> = ({ inventory, detailed = false }) => {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'good':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'fair':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'poor':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      germination: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      seedling: 'text-green-400 bg-green-500/10 border-green-500/30',
      vegetative: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      'pre-flowering': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      flowering: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
      ripening: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      harvesting: 'text-red-400 bg-red-500/10 border-red-500/30'
    };
    return stageColors[stage] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card className="bg-[#181b21] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Plants</p>
                  <p className="text-2xl font-bold text-white">{inventory.totalPlants}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Sprout className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-[#181b21] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Active Plants</p>
                  <p className="text-2xl font-bold text-emerald-400">{inventory.activePlants}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-[#181b21] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Avg Health</p>
                  <p className="text-2xl font-bold text-white">{inventory.averageHealth.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Heart className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <Progress
                value={inventory.averageHealth}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-[#181b21] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Est. Yield</p>
                  <p className="text-2xl font-bold text-white">{inventory.estimatedYield}g</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Award className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {detailed && (
        <>
          {/* Growth Stage Distribution */}
          <Card className="bg-[#181b21] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-emerald-400" />
                Growth Stage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(inventory.byStage).map(([stage, count]) => (
                  <div key={stage} className="text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`p-3 rounded-lg ${getStageColor(stage)}`}>
                        <Sprout className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{count}</p>
                        <p className="text-xs text-gray-400 capitalize">{stage.replace('-', ' ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Health Status Distribution */}
          <Card className="bg-[#181b21] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Heart className="w-5 h-5 mr-2 text-emerald-400" />
                Health Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(inventory.byHealth).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`p-3 rounded-lg border ${getHealthColor(status)}`}>
                        <Heart className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{count}</p>
                        <p className="text-xs text-gray-400 capitalize">{status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#181b21] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CheckSquare className="w-5 h-5 mr-2 text-emerald-400" />
                  Tasks Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Upcoming Tasks</span>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                    {inventory.upcomingTasks}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Overdue Tasks</span>
                  <Badge variant="outline" className="border-red-500/30 text-red-400">
                    {inventory.overdueTasks}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#181b21] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-emerald-400" />
                  Plants Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(inventory.byHealth)
                  .filter(([status]) => ['poor', 'critical'].includes(status))
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-gray-400 capitalize">{status} health</span>
                      <Badge variant="outline" className={`${
                        status === 'critical' ? 'border-red-500/30 text-red-400' : 'border-orange-500/30 text-orange-400'
                      }`}>
                        {count}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
          </div>

          {/* Top Strains */}
          {Object.keys(inventory.byStrain).length > 0 && (
            <Card className="bg-[#181b21] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-emerald-400" />
                  Plant Distribution by Strain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(inventory.byStrain)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 9)
                    .map(([strainName, count]) => (
                      <div key={strainName} className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-gray-800">
                        <span className="text-white text-sm">{strainName}</span>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                          {count} plants
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Distribution */}
          {Object.keys(inventory.byLocation).length > 0 && (
            <Card className="bg-[#181b21] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-emerald-400" />
                  Plant Distribution by Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(inventory.byLocation)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([location, count]) => (
                      <div key={location} className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-gray-800">
                        <span className="text-white text-sm">{location}</span>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                          {count} plants
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default PlantInventory;