import React from 'react';
import { useSocketContext } from '../../contexts/SocketContext';

const Sensors: React.FC = () => {
  const { lastSensorData, isConnected } = useSocketContext();

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Sensor Monitoring</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#181b21] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Temperature</h3>
          <p className="text-2xl font-bold text-emerald-400">
            {lastSensorData ? `${lastSensorData.temperature}°F` : '--'}
          </p>
        </div>

        <div className="bg-[#181b21] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Humidity</h3>
          <p className="text-2xl font-bold text-blue-400">
            {lastSensorData ? `${lastSensorData.humidity}%` : '--'}
          </p>
        </div>

        <div className="bg-[#181b21] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">pH Level</h3>
          <p className="text-2xl font-bold text-cyan-400">
            {lastSensorData ? lastSensorData.pH : '--'}
          </p>
        </div>

        <div className="bg-[#181b21] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">EC Level</h3>
          <p className="text-2xl font-bold text-purple-400">
            {lastSensorData ? lastSensorData.EC : '--'}
          </p>
        </div>

        <div className="bg-[#181b21] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">CO2</h3>
          <p className="text-2xl font-bold text-orange-400">
            {lastSensorData ? `${lastSensorData.CO2} ppm` : '--'}
          </p>
        </div>

        <div className="bg-[#181b21] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">VPD</h3>
          <p className="text-2xl font-bold text-yellow-400">
            {lastSensorData ? lastSensorData.VPD : '--'}
          </p>
        </div>
      </div>

      <div className="mt-6 bg-[#181b21] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Connection Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-gray-300">
            {isConnected ? 'Connected to real-time sensor data' : 'Disconnected from sensor server'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sensors;