import { maskSecrets, secureUpdate, isMasked } from '../../src/lib/settings-security';

describe('Settings Security Utils', () => {
  describe('isMasked', () => {
    it('should identify masked values', () => {
      expect(isMasked('sk_t****1234')).toBe(true);
      expect(isMasked('********')).toBe(true);
    });

    it('should identify unmasked values', () => {
      expect(isMasked('sk_test_123456789')).toBe(false);
      expect(isMasked('password123')).toBe(false);
      expect(isMasked('')).toBe(false);
    });
  });

  describe('maskSecrets', () => {
    it('should mask API keys', () => {
      const settings = {
        openai: {
          apiKey: 'sk_test_1234567890abcdef',
          model: 'gpt-4'
        }
      };
      const masked = maskSecrets(settings);
      expect(masked.openai.apiKey).toBe('sk_t****cdef');
      expect(masked.openai.model).toBe('gpt-4');
    });

    it('should mask short secrets fully', () => {
      const settings = {
        secret: '123456'
      };
      const masked = maskSecrets(settings);
      expect(masked.secret).toBe('********');
    });

    it('should handle nested objects', () => {
      const settings = {
        providers: {
          openai: {
            apiKey: 'sk_test_1234567890'
          }
        }
      };
      const masked = maskSecrets(settings);
      expect(masked.providers.openai.apiKey).toContain('****');
    });

    it('should ignore non-secret keys', () => {
      const settings = {
        name: 'My App',
        description: 'A cool app'
      };
      const masked = maskSecrets(settings);
      expect(masked).toEqual(settings);
    });
  });

  describe('secureUpdate', () => {
    it('should update normal values', () => {
      const current = { model: 'gpt-3.5' };
      const incoming = { model: 'gpt-4' };
      const result = secureUpdate(current, incoming);
      expect(result.model).toBe('gpt-4');
    });

    it('should update unmasked secrets', () => {
      const current = { apiKey: 'old_key' };
      const incoming = { apiKey: 'new_key' };
      const result = secureUpdate(current, incoming);
      expect(result.apiKey).toBe('new_key');
    });

    it('should preserve current secret if incoming is masked', () => {
      const current = { apiKey: 'real_secret_key' };
      const incoming = { apiKey: 'real****_key' };
      const result = secureUpdate(current, incoming);
      expect(result.apiKey).toBe('real_secret_key');
    });

    it('should handle deep updates with mixed masked/unmasked values', () => {
      const current = {
        openai: {
          apiKey: 'current_key',
          model: 'gpt-3.5'
        }
      };
      const incoming = {
        openai: {
          apiKey: 'curr****_key', // Masked, should be ignored
          model: 'gpt-4'         // Changed, should be updated
        }
      };
      const result = secureUpdate(current, incoming);
      expect(result.openai.apiKey).toBe('current_key');
      expect(result.openai.model).toBe('gpt-4');
    });
  });
});
