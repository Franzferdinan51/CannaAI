import React, { useState } from 'react';
import { Globe, Webhook, Zap, Plus, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store';
import { SettingsCard } from './SettingsPrimitives';
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

  const cards = [
    {
      id: 'endpoint' as const,
      icon: Globe,
      title: 'API Endpoints',
      description: 'Manage external API connections',
      cta: 'Add Endpoint',
    },
    {
      id: 'webhook' as const,
      icon: Webhook,
      title: 'Webhooks',
      description: 'Configure webhook notifications',
      cta: 'Add Webhook',
    },
    {
      id: 'services' as const,
      icon: Zap,
      title: 'Third-party Services',
      description: 'Connect with external services',
      cta: 'Browse Services',
    },
  ];

  const savedCount = integrations
    ? integrations.apiEndpoints.length + integrations.webhooks.length + integrations.thirdPartyServices.length
    : 0;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Zap}
        title="Integrations"
        subtitle="Configure third-party services and API integrations"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => { setNotice(''); setActiveForm(card.id); }}
                className="group text-left p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-300/30 hover:bg-emerald-400/[0.04] transition-all duration-300"
              >
                <div className="p-2 rounded-xl bg-emerald-400/10 border border-emerald-300/20 w-fit mb-3 group-hover:shadow-[0_0_16px_-4px_rgba(52,211,153,0.7)] transition-shadow">
                  <Icon className="w-4 h-4 text-emerald-300" strokeWidth={2.2} />
                </div>
                <h3 className="font-semibold text-white text-[14px] mb-1">{card.title}</h3>
                <p className="text-[12px] text-white/40 mb-3 leading-snug">{card.description}</p>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {card.cta}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {notice && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-emerald-300 font-medium mb-3"
            >
              <CheckCircle2 className="w-4 h-4" />
              {notice}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeForm && activeForm !== 'services' && (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={(event) => { event.preventDefault(); saveIntegration(activeForm); }}
              className="p-4 sm:p-5 rounded-2xl bg-emerald-400/[0.05] border border-emerald-300/25 space-y-3"
            >
              <h3 className="font-semibold text-white text-[15px]">
                Add {activeForm === 'endpoint' ? 'API endpoint' : 'webhook'}
              </h3>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="input-glow w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-300/50 transition-colors"
              />
              <input
                required
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/..."
                className="input-glow w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-300/50 transition-colors"
              />
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setActiveForm(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] text-white/80 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-glow px-5 py-2.5 rounded-xl text-sm">
                  Save
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeForm === 'services' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white text-[15px]">Configured integrations</h3>
                  <p className="text-[12px] text-white/40 mt-0.5">
                    {savedCount > 0 ? `${savedCount} saved in this workspace` : 'Endpoints and webhooks saved in this workspace'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveForm(null)}
                  aria-label="Close"
                  className="p-2 rounded-xl hover:bg-white/[0.07] text-white/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {integrations && savedCount > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {integrations.apiEndpoints.map((endpoint) => (
                    <div key={endpoint.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                      <div className="flex items-center gap-2 text-white text-sm font-semibold">
                        <Globe className="h-4 w-4 text-emerald-300 shrink-0" />
                        <span className="truncate">{endpoint.name}</span>
                      </div>
                      <p className="mt-1.5 break-all text-[11px] text-white/40 font-mono">{endpoint.method} {endpoint.url}</p>
                    </div>
                  ))}
                  {integrations.webhooks.map((webhook) => (
                    <div key={webhook.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                      <div className="flex items-center gap-2 text-white text-sm font-semibold">
                        <Webhook className="h-4 w-4 text-emerald-300 shrink-0" />
                        <span className="truncate">{webhook.name}</span>
                      </div>
                      <p className="mt-1.5 break-all text-[11px] text-white/40 font-mono">{webhook.url}</p>
                    </div>
                  ))}
                  {integrations.thirdPartyServices.map((service) => (
                    <div key={service.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                      <div className="flex items-center gap-2 text-white text-sm font-semibold">
                        <Zap className="h-4 w-4 text-emerald-300 shrink-0" />
                        <span className="truncate">{service.name}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-white/40">{service.status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/40">
                  No integrations configured yet. Add an endpoint or webhook above.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>
    </div>
  );
};

export default IntegrationSettings;
