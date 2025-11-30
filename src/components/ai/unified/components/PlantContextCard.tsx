import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Thermometer, Droplets, Activity, Zap, Sun, Shield, Heart } from 'lucide-react';
import { PlantContext } from '../types/assistant';

interface PlantContextCardProps {
  plantContext: PlantContext;
}

export const PlantContextCard = ({ plantContext }: PlantContextCardProps) => {
  return (
    <Card className="bg-slate-800 border-slate-600 mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-green-400 flex items-center">
          <Leaf className="h-4 w-4 mr-2" />
          Plant Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Strain:</span>
            <span className="ml-1 text-slate-200 font-medium">{plantContext.strain}</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Stage:</span>
            <span className="ml-1 text-slate-200 font-medium capitalize">{plantContext.growthStage}</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Age:</span>
            <span className="ml-1 text-slate-200 font-medium">{plantContext.age} days</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Health:</span>
            <span className={`ml-1 font-medium ${plantContext.lastAnalysis?.healthScore && plantContext.lastAnalysis.healthScore > 80
                ? 'text-green-400'
                : plantContext.lastAnalysis?.healthScore && plantContext.lastAnalysis.healthScore > 60
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
              {plantContext.lastAnalysis?.healthScore || 'N/A'}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-700 p-2 rounded text-center">
            <Thermometer className="h-3 w-3 mx-auto mb-1 text-orange-400" />
            <div className="text-slate-400">Temp</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.temperature}°C</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Droplets className="h-3 w-3 mx-auto mb-1 text-blue-400" />
            <div className="text-slate-400">Humidity</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.humidity}%</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Activity className="h-3 w-3 mx-auto mb-1 text-purple-400" />
            <div className="text-slate-400">pH</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.ph}</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Zap className="h-3 w-3 mx-auto mb-1 text-yellow-400" />
            <div className="text-slate-400">EC</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.ec}</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Sun className="h-3 w-3 mx-auto mb-1 text-amber-400" />
            <div className="text-slate-400">Light</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.lightHours}h</div>
          </div>
          {plantContext.environment.co2 && (
            <div className="bg-slate-700 p-2 rounded text-center">
              <Shield className="h-3 w-3 mx-auto mb-1 text-green-400" />
              <div className="text-slate-400">CO₂</div>
              <div className="text-slate-200 font-medium">{plantContext.environment.co2}ppm</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
