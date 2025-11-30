import React from 'react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import icons
import { CheckSquare } from 'lucide-react';

const PlantTasks: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-[#181b21] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CheckSquare className="w-5 h-5 mr-2 text-emerald-400" />
            Plant Tasks & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Task management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantTasks;