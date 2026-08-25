import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plant, PlantStrain } from '../types';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import icons
import { Activity } from 'lucide-react';

interface PlantAnalysisProps {
  plants: Plant[];
  strains: PlantStrain[];
  onAnalyze: (plantId: string) => void;
}

const PlantAnalysis: React.FC<PlantAnalysisProps> = ({
  plants,
  strains,
  onAnalyze
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className="bg-[#181b21] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-emerald-400" />
            Plant Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-gray-400">Choose a plant for analysis or open the camera scanner for a new photo.</p>
            <button type="button" onClick={() => navigate('/scanner')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Open Scanner</button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-800">
              <h4 className="text-white font-medium mb-2">Available Plants for Analysis</h4>
              <p className="text-2xl font-bold text-emerald-400">{plants.length}</p>
            </div>
            <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-800">
              <h4 className="text-white font-medium mb-2">Strain Database</h4>
              <p className="text-2xl font-bold text-blue-400">{strains.length}</p>
            </div>
          </div>
          {plants.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-300">Available plants</h4>
              {plants.slice(0, 8).map((plant) => (
                <div key={plant.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0f1419] p-3">
                  <span className="text-sm text-white">{plant.name}</span>
                  <button type="button" onClick={() => onAnalyze(plant.id)} className="text-sm text-emerald-400 hover:text-emerald-300">Analyze</button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantAnalysis;
