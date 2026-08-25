import React, { useState } from 'react';
import { Zap } from 'lucide-react';

const IntegrationSettings: React.FC = () => {
  const [activeForm, setActiveForm] = useState<'endpoint' | 'webhook' | 'services' | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');

  const saveIntegration = (kind: 'endpoint' | 'webhook') => {
    const key = `cannaai.integration.${kind}`;
    localStorage.setItem(key, JSON.stringify({ name: name.trim(), url: url.trim(), updatedAt: new Date().toISOString() }));
    setNotice(`${kind === 'endpoint' ? 'API endpoint' : 'Webhook'} saved locally.`);
    setActiveForm(null);
    setName('');
    setUrl('');
  };

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
            <button type="button" onClick={() => { setNotice(''); setActiveForm('endpoint'); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              Add Endpoint
            </button>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-medium text-white mb-2">Webhooks</h3>
            <p className="text-sm text-gray-400 mb-4">Configure webhook notifications</p>
            <button type="button" onClick={() => { setNotice(''); setActiveForm('webhook'); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              Add Webhook
            </button>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg">
            <h3 className="font-medium text-white mb-2">Third-party Services</h3>
            <p className="text-sm text-gray-400 mb-4">Connect with external services</p>
            <button type="button" onClick={() => { setNotice('Browse Services is not connected yet. Use Add Endpoint or Add Webhook for local integrations.'); setActiveForm('services'); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
              Browse Services
            </button>
          </div>

          {activeForm && activeForm !== 'services' && (
            <form onSubmit={(event) => { event.preventDefault(); saveIntegration(activeForm); }} className="p-4 bg-gray-800/70 border border-emerald-500/30 rounded-lg space-y-3">
              <h3 className="font-medium text-white">Add {activeForm === 'endpoint' ? 'API endpoint' : 'webhook'}</h3>
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">Save</button>
                <button type="button" onClick={() => setActiveForm(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
              </div>
            </form>
          )}
          {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings;
