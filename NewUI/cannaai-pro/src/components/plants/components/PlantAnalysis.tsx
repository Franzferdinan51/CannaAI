import React from 'react';
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
          <p className="text-gray-400">AI-powered plant analysis interface coming soon...</p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantAnalysis;