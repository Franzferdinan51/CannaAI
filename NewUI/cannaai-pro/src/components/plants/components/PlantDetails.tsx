import React from 'react';
import { Plant } from '../types';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import icons
import { Sprout } from 'lucide-react';

interface PlantDetailsProps {
  plant: Plant;
  onEdit: (plant: Plant) => void;
  onDelete: (plantId: string) => void;
  onAnalyze: (plantId: string) => void;
  onUpdate: (updates: Partial<Plant>) => void;
}

const PlantDetails: React.FC<PlantDetailsProps> = ({
  plant,
  onEdit,
  onDelete,
  onAnalyze,
  onUpdate
}) => {
  return (
    <div className="space-y-6">
      <Card className="bg-[#181b21] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center">
              <Sprout className="w-5 h-5 mr-2 text-emerald-400" />
              {plant.name}
            </span>
            <div className="flex space-x-2">
              <Button
                onClick={() => onAnalyze(plant.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Analyze
              </Button>
              <Button
                onClick={() => onEdit(plant)}
                variant="outline"
                className="border-gray-700 text-gray-300"
              >
                Edit
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-[#0f1419] p-4"><p className="text-xs text-gray-400">Growth stage</p><p className="mt-1 text-white capitalize">{plant.stage}</p></div>
            <div className="rounded-lg bg-[#0f1419] p-4"><p className="text-xs text-gray-400">Health score</p><p className="mt-1 text-emerald-400">{Number(plant.health?.score ?? 0).toFixed(1)}% ({plant.health?.status || 'unknown'})</p></div>
            <div className="rounded-lg bg-[#0f1419] p-4"><p className="text-xs text-gray-400">Age</p><p className="mt-1 text-white">{plant.age} days</p></div>
            <div className="rounded-lg bg-[#0f1419] p-4"><p className="text-xs text-gray-400">Location</p><p className="mt-1 text-white">{plant.location?.name || 'Unassigned'}</p></div>
          </div>
          {plant.notes && <p className="mt-4 text-sm text-gray-400">{plant.notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {(plant.tags || []).map((tag) => <span key={tag} className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300">{tag}</span>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantDetails;
