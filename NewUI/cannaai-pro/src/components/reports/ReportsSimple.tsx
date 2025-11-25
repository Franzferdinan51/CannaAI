import React from 'react';
import { FileText, Plus } from 'lucide-react';

const ReportsSimple: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
        <h2 className="text-2xl font-bold mb-2">Reports & Analytics</h2>
        <p className="text-gray-400 mb-4">Comprehensive reporting and analytics dashboard</p>
        <div className="space-y-2 text-left max-w-md mx-auto">
          <div className="p-3 bg-gray-800 rounded">
            <h3 className="font-medium mb-1">📊 Analytics Dashboard</h3>
            <p className="text-sm text-gray-400">View detailed analytics and insights</p>
          </div>
          <div className="p-3 bg-gray-800 rounded">
            <h3 className="font-medium mb-1">🌱 Plant Growth Reports</h3>
            <p className="text-sm text-gray-400">Track plant growth over time</p>
          </div>
          <div className="p-3 bg-gray-800 rounded">
            <h3 className="font-medium mb-1">💰 Financial Analytics</h3>
            <p className="text-sm text-gray-400">Monitor costs and revenue</p>
          </div>
          <div className="p-3 bg-gray-800 rounded">
            <h3 className="font-medium mb-1">📝 Custom Reports</h3>
            <p className="text-sm text-gray-400">Build and customize reports</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsSimple;