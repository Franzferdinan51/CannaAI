import { executeAIWithFallback } from '../ai-provider-detection';

export const SchemaType = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number'
} as const;

/** Compatibility surface for older council services using the Gemini SDK shape. */
export function createLocalAIClient() {
  return {
    getGenerativeModel(config: any) {
      return {
        async generateContent(prompt: unknown) {
          const promptText = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
          const wantsJson = config?.generationConfig?.responseMimeType === 'application/json';
          const instruction = wantsJson
            ? '\nReturn only valid JSON matching the requested structure. Do not include markdown fences.'
            : '';
          const response = await executeAIWithFallback(`${promptText}${instruction}`, undefined, {
            timeout: 90000,
            maxRetries: 2
          });
          const text = typeof response.result === 'string' ? response.result : JSON.stringify(response.result);
          if (!text.trim()) throw new Error('AI provider returned an empty response');
          return { response: { text: () => text } };
        }
      };
    }
  };
}
