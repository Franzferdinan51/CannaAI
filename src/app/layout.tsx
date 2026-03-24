// This must be at the very top to prevent localStorage errors
if (typeof window === 'undefined') {
  // @ts-ignore - Server-side localStorage shim
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    get length() { return 0; },
  };
}

import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CannaAI',
  description: 'AI-Powered Cannabis Cultivation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
