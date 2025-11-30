import React from 'react';
import { Zap, Globe, Api, Webhook } from 'lucide-react';

const IntegrationSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          Integration Settings
        </h2>
        <p className="text-gray-400 mb-6">
          Configure third-party services and API integrations
        </p>

        <div className="space-y-6">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-medium text-white mb-2">API Endpoints</h3>
            <p className="text-sm text-gray-400 mb-4">Manage external API connections</p>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              Add Endpoint
            </button>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-medium text-white mb-2">Webhooks</h3>
            <p className="text-sm text-gray-400 mb-4">Configure webhook notifications</p>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              Add Webhook
            </button>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-medium text-white mb-2">Third-party Services</h3>
            <p className="text-sm text-gray-400 mb-4">Connect with external services</p>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              Browse Services
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings;
