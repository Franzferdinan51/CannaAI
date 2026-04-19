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
import type { Metadata, Viewport } from 'next';
import './service-worker-register.js';

export const viewport: Viewport = {
  themeColor: '#00ff88',
  backgroundColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'CannaAI',
  description: 'AI-Powered Cannabis Cultivation',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CannaAI',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
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
