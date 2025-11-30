import React from 'react';
import { Bot, Activity, Droplets, Lightbulb, Thermometer, Wind, Shield, Calendar, History } from 'lucide-react';

const AutomationSimple: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center max-w-2xl mx-auto">
        <Bot className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
        <h2 className="text-2xl font-bold mb-2">Automation System</h2>
        <p className="text-gray-400 mb-6">Environmental controls and automation for your cultivation</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Thermometer className="w-6 h-6 text-orange-400" />
              <h3 className="font-medium text-lg">Climate Control</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">Temperature and humidity management</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Temperature:</span>
                <span className="text-emerald-400 font-medium">75°F</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Humidity:</span>
                <span className="text-blue-400 font-medium">60%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Status:</span>
                <span className="text-green-400 font-medium">Optimal</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Droplets className="w-6 h-6 text-blue-400" />
              <h3 className="font-medium text-lg">Irrigation System</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">Automated watering and nutrient delivery</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Last Watering:</span>
                <span className="text-emerald-400 font-medium">2h ago</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Next Scheduled:</span>
                <span className="text-yellow-400 font-medium">In 6h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">pH Level:</span>
                <span className="text-cyan-400 font-medium">6.2</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              <h3 className="font-medium text-lg">Lighting Control</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">Automated lighting schedules and intensity</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Current Stage:</span>
                <span className="text-emerald-400 font-medium">Vegetative</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Light Hours:</span>
                <span className="text-blue-400 font-medium">18/6</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Intensity:</span>
                <span className="text-orange-400 font-medium">75%</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Wind className="w-6 h-6 text-cyan-400" />
              <h3 className="font-medium text-lg">Air Quality</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">CO2 levels and air circulation management</p>
            <div className="space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">CO2 Level:</span>
                <span className="text-emerald-400 font-medium">450 ppm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Air Flow:</span>
                <span className="text-blue-400 font-medium">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Filter Status:</span>
                <span className="text-green-400 font-medium">Good</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-purple-400" />
              <h3 className="font-medium text-lg">Scheduling</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">Manage automation schedules</p>
            <div className="text-left">
              <div className="text-2xl font-bold text-emerald-400 mb-1">12</div>
              <div className="text-xs text-gray-400">Active Schedules</div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <History className="w-6 h-6 text-yellow-400" />
              <h3 className="font-medium text-lg">Activity Log</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">View automation history</p>
            <div className="text-left">
              <div className="text-2xl font-bold text-blue-400 mb-1">247</div>
              <div className="text-xs text-gray-400">Actions Today</div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-red-400" />
              <h3 className="font-medium text-lg">Safety</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">Safety monitoring and alerts</p>
            <div className="text-left">
              <div className="text-2xl font-bold text-green-400 mb-1">All Clear</div>
              <div className="text-xs text-gray-400">No Active Alerts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationSimple;