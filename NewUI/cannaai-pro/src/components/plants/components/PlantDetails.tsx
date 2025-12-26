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
          <p className="text-gray-400">Detailed plant information coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantDetails;