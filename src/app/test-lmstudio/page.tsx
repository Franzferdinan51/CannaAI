import { LMStudioTest } from '@/components/lmstudio/LMStudioTest';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LM Studio Test - CannaAI',
  description: 'Test LM Studio integration and model loading',
};

export default function LMStudioTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          LM Studio Integration Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test your LM Studio setup and verify model loading functionality.
        </p>
      </div>

      <LMStudioTest />
    </div>
  );
}