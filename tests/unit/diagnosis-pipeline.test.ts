import {
  parseTriageOutput,
  buildTriagePrompt,
  formatTriageForPrompt,
  shouldSkipDeepAnalysis,
  runTriageStage,
  type TriageResult,
} from '@/lib/diagnosis-pipeline';

const healthyTriage: TriageResult = {
  healthStatus: 'healthy',
  confidence: 0.92,
  suspectedIssues: [],
  urgency: 'low',
  focusAreas: ['overall'],
  summary: 'Vigorous plant, no visible issues.',
  triageMs: 1200,
};

describe('diagnosis-pipeline', () => {
  describe('parseTriageOutput', () => {
    it('parses a clean JSON triage response', () => {
      const raw = JSON.stringify({
        healthStatus: 'stressed',
        confidence: 0.78,
        suspectedIssues: ['nitrogen deficiency'],
        urgency: 'medium',
        focusAreas: ['leaves'],
        summary: 'Lower leaves yellowing.',
      });
      const t = parseTriageOutput(raw, 500);
      expect(t.healthStatus).toBe('stressed');
      expect(t.confidence).toBeCloseTo(0.78);
      expect(t.suspectedIssues).toEqual(['nitrogen deficiency']);
      expect(t.summary).toBe('Lower leaves yellowing.');
    });

    it('strips markdown code fences', () => {
      const raw = '```json\n{"healthStatus":"healthy","confidence":0.9,"suspectedIssues":[],"urgency":"low","focusAreas":["overall"],"summary":"Looks good."}\n```';
      const t = parseTriageOutput(raw, 500);
      expect(t.healthStatus).toBe('healthy');
    });

    it('degrades to unknown on unparseable output instead of throwing', () => {
      const t = parseTriageOutput('not json at all', 500);
      expect(t.healthStatus).toBe('unknown');
      expect(t.confidence).toBeLessThanOrEqual(0.4);
    });

    it('clamps confidence and invalid enums', () => {
      const t = parseTriageOutput(JSON.stringify({
        healthStatus: 'bogus', confidence: 5, urgency: 'bogus', summary: 'x',
      }), 100);
      expect(t.healthStatus).toBe('unknown');
      expect(t.confidence).toBeLessThanOrEqual(1);
      expect(t.urgency).toBe('medium');
    });
  });

  describe('shouldSkipDeepAnalysis', () => {
    it('skips only confident healthy verdicts', () => {
      expect(shouldSkipDeepAnalysis(healthyTriage)).toBe(true);
      expect(shouldSkipDeepAnalysis({ ...healthyTriage, confidence: 0.7 })).toBe(false);
      expect(shouldSkipDeepAnalysis({ ...healthyTriage, healthStatus: 'stressed' })).toBe(false);
      expect(shouldSkipDeepAnalysis({ ...healthyTriage, healthStatus: 'unknown' })).toBe(false);
    });
  });

  describe('formatTriageForPrompt', () => {
    it('tells the deep model to verify, not trust', () => {
      const text = formatTriageForPrompt({
        ...healthyTriage, healthStatus: 'stressed', suspectedIssues: ['spider mites'],
      });
      expect(text).toContain('spider mites');
      expect(text).toMatch(/verify/i);
      expect(text).not.toMatch(/blindly trust/i);
    });
  });

  describe('buildTriagePrompt', () => {
    it('includes grower context when provided', () => {
      const p = buildTriagePrompt({ strain: 'Purple Sunshine', growthStage: 'flower' });
      expect(p).toContain('Purple Sunshine');
      expect(p).toContain('flower');
      expect(p).toContain('ONLY a JSON object');
    });
  });

  describe('runTriageStage', () => {
    it('returns parsed triage on provider success', async () => {
      const t = await runTriageStage('img', {}, async () => ({
        text: JSON.stringify({
          healthStatus: 'critical', confidence: 0.88, suspectedIssues: ['bud rot'],
          urgency: 'critical', focusAreas: ['buds'], summary: 'Mold on colas.',
        }),
        provider: 'lmstudio',
      }));
      expect(t.healthStatus).toBe('critical');
      expect(t.triageModel).toBe('lmstudio');
    });

    it('degrades to unknown when the provider throws', async () => {
      const t = await runTriageStage('img', {}, async () => { throw new Error('down'); });
      expect(t.healthStatus).toBe('unknown');
      expect(t.summary).toMatch(/full analysis/);
    });
  });
});
