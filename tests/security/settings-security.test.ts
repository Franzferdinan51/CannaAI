import { maskSettings, maskApiKey } from '@/lib/settings-security';

describe('Settings Security', () => {
  describe('maskApiKey', () => {
    it('should mask short keys completely', () => {
      const shortKey = '12345';
      expect(maskApiKey(shortKey)).toBe('********');
    });

    it('should partially mask long keys', () => {
      const longKey = 'sk-1234567890abcdef1234';
      const masked = maskApiKey(longKey);
      expect(masked).toBe('sk-***1234');
      expect(masked).not.toContain('5678');
    });

    it('should return empty string for empty input', () => {
      expect(maskApiKey('')).toBe('');
    });
  });

  describe('maskSettings', () => {
    const mockSettings = {
      aiProvider: 'lm-studio',
      lmStudio: {
        url: 'http://localhost:1234',
        apiKey: 'short',
        model: 'llama'
      },
      openRouter: {
        apiKey: 'sk-or-v1-abcdef1234567890',
        model: 'gpt-4'
      },
      openai: { apiKey: 'sk-openai-key-12345678' },
      gemini: { apiKey: 'AIzaSyD-12345678' },
      groq: { apiKey: 'gsk_12345678' },
      anthropic: { apiKey: 'sk-ant-12345678' },
      other: {
        apiKey: 'should-not-be-masked-if-not-in-list'
      }
    };

    it('should mask API keys for known providers', () => {
      const masked = maskSettings(mockSettings);

      expect(masked.lmStudio.apiKey).toBe('********');
      expect(masked.openRouter.apiKey).toBe('sk-***7890');
      expect(masked.openai.apiKey).toBe('sk-***5678');
      expect(masked.gemini.apiKey).toBe('AIz***5678');
      expect(masked.groq.apiKey).toBe('gsk***5678');
      expect(masked.anthropic.apiKey).toBe('sk-***5678');
    });

    it('should preserve other fields', () => {
      const masked = maskSettings(mockSettings);
      expect(masked.lmStudio.url).toBe('http://localhost:1234');
      expect(masked.openRouter.model).toBe('gpt-4');
    });

    it('should not mutate original object', () => {
      const settings = { ...mockSettings };
      maskSettings(settings);
      expect(settings.openRouter.apiKey).toBe('sk-or-v1-abcdef1234567890');
    });

    it('should handle missing fields gracefully', () => {
      const settings = { aiProvider: 'none' };
      const masked = maskSettings(settings);
      expect(masked).toEqual(settings);
    });
  });
});
