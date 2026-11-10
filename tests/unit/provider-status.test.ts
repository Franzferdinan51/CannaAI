/** @jest-environment node */

import { markUnprobedProviders } from '@/lib/provider-status';

describe('markUnprobedProviders', () => {
  it('marks stored provider booleans as not-probed instead of parroting them', () => {
    const config = {
      openai: { apiKey: '', model: '', connected: false },
      openRouter: { apiKey: '', model: 'x', connected: false },
      hermes: { apiKey: '', model: '', connected: true },
    };
    const marked = markUnprobedProviders(config);
    expect(marked.openai).toEqual({
      apiKey: '', model: '', connected: null, statusSource: 'not-probed',
    });
    expect(marked.openRouter.connected).toBeNull();
    // Even a stored `true` is unverified — nobody probed it.
    expect(marked.hermes.connected).toBeNull();
    expect(marked.hermes.statusSource).toBe('not-probed');
  });

  it('leaves lmStudio for the live-probe overlay', () => {
    const config = { lmStudio: { url: 'http://localhost:1234', connected: false } };
    expect(markUnprobedProviders(config).lmStudio).toEqual({
      url: 'http://localhost:1234',
      connected: false,
    });
  });

  it('leaves entries without a connected field, and non-provider sections, untouched', () => {
    const config = {
      bailian: { apiKey: '', model: 'qwen-vl-max-latest' },
      units: { temperature: 'fahrenheit' },
      notifications: { enabled: true },
      aiProvider: 'lm-studio',
    };
    expect(markUnprobedProviders(config)).toEqual(config);
  });

  it('does not mutate the stored config it was given', () => {
    const config = { openai: { connected: false } };
    markUnprobedProviders(config);
    expect(config.openai.connected).toBe(false);
  });
});
