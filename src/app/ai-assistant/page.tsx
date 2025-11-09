'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AIAssistantPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main dashboard where the unified AI assistant is located
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to AI Assistant...</p>
      </div>
    </div>
  );
}