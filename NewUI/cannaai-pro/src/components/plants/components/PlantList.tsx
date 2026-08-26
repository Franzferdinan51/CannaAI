import React from 'react';
import { Plant } from '../types';

// Import UI components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import icons
import { Sprout, Trash2 } from 'lucide-react';

interface PlantListProps {
  plants: Plant[];
  onSelect: (plant: Plant) => void;
  onEdit: (plant: Plant) => void;
  onDelete: (plantId: string) => void;
  onAnalyze: (plantId: string) => void;
  isLoading?: boolean;
}

const PlantList: React.FC<PlantListProps> = ({
  plants,
  onSelect,
  onEdit,
  onDelete,
  onAnalyze,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-[#181b21] border border-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-800 rounded mb-2"></div>
            <div className="h-3 bg-gray-800 rounded mb-4"></div>
            <div className="h-8 bg-gray-800 rounded"></div>
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
        <p className="text-gray-500">Try adjusting your search criteria or add new plants.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plants.map((plant) => (
        <Card
          key={plant.id}
          className="relative bg-[#181b21] border-gray-800 rounded-xl hover:border-emerald-500/50 transition-all duration-200 cursor-pointer"
        >
          <button
            type="button"
            aria-label={`Open plant ${plant.name}`}
            onClick={() => onSelect(plant)}
            className="absolute inset-0 z-0 h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          />
          <CardContent className="relative z-[1] p-6 pointer-events-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{plant.name}</h3>
                <p className="text-sm text-gray-400">{plant.strain?.name || 'Unknown Strain'}</p>
                <div className="flex items-center mt-2 space-x-3">
                  <span className="text-xs text-gray-500">Stage: {plant.stage}</span>
                  <span className="text-xs text-gray-500">Health: {plant.health.score}%</span>
                </div>
              </div>
              <div className="pointer-events-auto relative z-10 flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze(plant.id);
                  }}
                  className="border-gray-700 text-gray-300"
                >
                  Analyze
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(plant);
                  }}
                  className="border-gray-700 text-gray-300"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Delete ${plant.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(plant.id);
                  }}
                  className="border-red-800 text-red-300 hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PlantList;
