import React from 'react';
import { PlantStrain } from '../types';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import icons
import { Database } from 'lucide-react';

interface StrainManagerProps {
  strains: PlantStrain[];
  onStrainCreate: (strain: PlantStrain) => void;
  onStrainUpdate: (strain: PlantStrain) => void;
  onStrainDelete: (strainId: string) => void;
}

const StrainManager: React.FC<StrainManagerProps> = ({
  strains,
  onStrainCreate,
  onStrainUpdate,
  onStrainDelete
}) => {
  return (
    <div className="space-y-6">
      <Card className="bg-[#181b21] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="w-5 h-5 mr-2 text-emerald-400" />
            Strain Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Strain management interface coming soon...</p>
          <div className="mt-4">
            <p className="text-sm text-gray-500">Total strains: {strains.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrainManager;