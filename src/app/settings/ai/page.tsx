import { AIProviderSettings } from '@/components/ai/AIProviderSettings';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Provider Settings - CannaAI',
  description: 'Configure AI providers and models for plant analysis and cultivation assistance',
};

export default function AISettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          AI Provider Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure AI providers and select models for plant analysis and cultivation assistance.
        </p>
      </div>

      <AIProviderSettings />
    </div>
  );
}