import React from 'react';
import { Sprout, Plus, Search, Filter } from 'lucide-react';

const PlantsSimple: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center max-w-2xl mx-auto">
        <Sprout className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
        <h2 className="text-2xl font-bold mb-2">Plant Management</h2>
        <p className="text-gray-400 mb-6">Manage your cannabis plant inventory and track growth</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="font-medium mb-3 text-lg">🌱 Plant Library</h3>
            <p className="text-sm text-gray-400 mb-4">View and manage all your plants</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Total Plants:</span>
                <span className="text-emerald-400 font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Active Growth:</span>
                <span className="text-blue-400 font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Ready to Harvest:</span>
                <span className="text-yellow-400 font-medium">0</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="font-medium mb-3 text-lg">🧬 Strain Management</h3>
            <p className="text-sm text-gray-400 mb-4">Manage cannabis strains and genetics</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Total Strains:</span>
                <span className="text-emerald-400 font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Indica:</span>
                <span className="text-purple-400 font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Sativa:</span>
                <span className="text-orange-400 font-medium">0</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="font-medium mb-3 text-lg">📊 Growth Analytics</h3>
            <p className="text-sm text-gray-400 mb-4">Track plant growth over time</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Average Height:</span>
                <span className="text-emerald-400 font-medium">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Health Score:</span>
                <span className="text-green-400 font-medium">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Growth Rate:</span>
                <span className="text-blue-400 font-medium">--</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="font-medium mb-3 text-lg">📋 Task Management</h3>
            <p className="text-sm text-gray-400 mb-4">Track cultivation tasks and schedules</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Pending Tasks:</span>
                <span className="text-yellow-400 font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Completed Today:</span>
                <span className="text-green-400 font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Overdue:</span>
                <span className="text-red-400 font-medium">0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Plant
          </button>
          <button className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Plants
          </button>
          <button className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlantsSimple;