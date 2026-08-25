import React, { useState } from 'react';
import { Globe, Webhook, Zap } from 'lucide-react';
import { useSettingsStore } from '../store';
import { APIEndpoint, Webhook as WebhookConfig } from '../types';

const IntegrationSettings: React.FC = () => {
  const [activeForm, setActiveForm] = useState<'endpoint' | 'webhook' | 'services' | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  const { settings, updateSettings } = useSettingsStore();
  const integrations = settings?.integrations;

  const saveIntegration = (kind: 'endpoint' | 'webhook') => {
    if (!settings || !name.trim() || !url.trim()) return;
    const id = `${kind}-${Date.now()}`;
    if (kind === 'endpoint') {
      const endpoint: APIEndpoint = {
        id, name: name.trim(), url: url.trim(), method: 'GET', headers: {}, enabled: true,
      };
      updateSettings({ integrations: { ...settings.integrations, apiEndpoints: [...settings.integrations.apiEndpoints, endpoint] } });
    } else {
      const webhook: WebhookConfig = {
        id, name: name.trim(), url: url.trim(), events: [], enabled: true, retryAttempts: 3,
      };
      updateSettings({ integrations: { ...settings.integrations, webhooks: [...settings.integrations.webhooks, webhook] } });
    }
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
            <button type="button" onClick={() => { setNotice(''); setActiveForm('services'); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
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
          {activeForm === 'services' && (
            <div className="p-4 bg-gray-800/70 border border-emerald-500/30 rounded-lg space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-white">Configured integrations</h3>
                  <p className="text-sm text-gray-400">Endpoints and webhooks saved in this workspace.</p>
                </div>
                <button type="button" onClick={() => setActiveForm(null)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Close</button>
              </div>
              {integrations && integrations.apiEndpoints.length + integrations.webhooks.length + integrations.thirdPartyServices.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {integrations.apiEndpoints.map((endpoint) => <div key={endpoint.id} className="rounded-lg border border-gray-700 bg-gray-900/60 p-3"><div className="flex items-center gap-2 text-white"><Globe className="h-4 w-4 text-emerald-400" />{endpoint.name}</div><p className="mt-1 break-all text-xs text-gray-400">{endpoint.method} {endpoint.url}</p></div>)}
                  {integrations.webhooks.map((webhook) => <div key={webhook.id} className="rounded-lg border border-gray-700 bg-gray-900/60 p-3"><div className="flex items-center gap-2 text-white"><Webhook className="h-4 w-4 text-emerald-400" />{webhook.name}</div><p className="mt-1 break-all text-xs text-gray-400">{webhook.url}</p></div>)}
                  {integrations.thirdPartyServices.map((service) => <div key={service.id} className="rounded-lg border border-gray-700 bg-gray-900/60 p-3"><div className="flex items-center gap-2 text-white"><Zap className="h-4 w-4 text-emerald-400" />{service.name}</div><p className="mt-1 text-xs text-gray-400">{service.status}</p></div>)}
                </div>
              ) : <p className="rounded-lg border border-dashed border-gray-700 p-5 text-center text-sm text-gray-400">No integrations configured yet. Add an endpoint or webhook above.</p>}
            </div>
          )}
          {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings;
