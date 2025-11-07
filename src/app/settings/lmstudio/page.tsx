import { LMStudioSettings } from '@/components/lmstudio/LMStudioSettings';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LM Studio Settings - CannaAI',
  description: 'Configure and manage local LM Studio models for plant analysis',
};

export default function LMStudioPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          LM Studio Integration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your local LM Studio models for AI-powered plant analysis and classification.
        </p>
      </div>

      <LMStudioSettings />
    </div>
  );
}