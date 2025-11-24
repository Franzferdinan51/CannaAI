import React from 'react';
import { motion } from 'framer-motion';
import { useSocketContext } from '../../contexts/SocketContext';
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { lastSensorData, isConnected } = useSocketContext();

  const stats = [
    {
      title: 'System Status',
      value: isConnected ? 'Online' : 'Offline',
      icon: <Activity className="w-6 h-6" />,
      color: isConnected ? 'text-emerald-400' : 'text-red-400',
      bgColor: isConnected ? 'bg-emerald-900/20' : 'bg-red-900/20',
    },
    {
      title: 'Temperature',
      value: lastSensorData ? `${lastSensorData.temperature}°F` : '--',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
    },
    {
      title: 'Humidity',
      value: lastSensorData ? `${lastSensorData.humidity}%` : '--',
      icon: <Activity className="w-6 h-6" />,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/20',
    },
    {
      title: 'Active Alerts',
      value: '0',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Monitor your cannabis cultivation system at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`${stat.bgColor} border border-gray-800 rounded-xl p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color}`}>
                {stat.icon}
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.title}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-[#181b21] border border-gray-800 rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm text-gray-300">System check completed</div>
                  <div className="text-xs text-gray-500">2 minutes ago</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-[#181b21] border border-gray-800 rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-emerald-900/20 border border-emerald-900/50 text-emerald-400 rounded-lg hover:bg-emerald-900/30 transition-colors">
              <div className="text-sm font-medium">New Analysis</div>
            </button>
            <button className="p-3 bg-blue-900/20 border border-blue-900/50 text-blue-400 rounded-lg hover:bg-blue-900/30 transition-colors">
              <div className="text-sm font-medium">View Reports</div>
            </button>
            <button className="p-3 bg-purple-900/20 border border-purple-900/50 text-purple-400 rounded-lg hover:bg-purple-900/30 transition-colors">
              <div className="text-sm font-medium">AI Assistant</div>
            </button>
            <button className="p-3 bg-orange-900/20 border border-orange-900/50 text-orange-400 rounded-lg hover:bg-orange-900/30 transition-colors">
              <div className="text-sm font-medium">Settings</div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;