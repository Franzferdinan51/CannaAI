import React, { useMemo, useState } from 'react';
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
  const [query, setQuery] = useState('');
  const visibleStrains = useMemo(() => strains.filter((strain) => `${strain.name} ${strain.lineage}`.toLowerCase().includes(query.toLowerCase())), [strains, query]);

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-400">Search the configured strain library and remove stale entries.</p>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search strains" className="rounded-lg border border-gray-700 bg-[#0f1419] px-3 py-2 text-sm text-white" />
          </div>
          <p className="mt-4 text-sm text-gray-500">Showing {visibleStrains.length} of {strains.length} strains</p>
          {visibleStrains.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">No matching strains. Add strains through the connected cultivation API.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleStrains.map((strain) => (
                <div key={strain.id} className="rounded-lg border border-gray-800 bg-[#0f1419] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-white">{strain.name}</h3>
                      <p className="text-xs text-gray-400">{strain.type} · {strain.lineage || 'Lineage not recorded'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onStrainDelete(strain.id)} className="text-red-400 hover:text-red-300">Remove</Button>
                  </div>
                  {strain.description && <p className="mt-2 text-sm text-gray-400">{strain.description}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StrainManager;
