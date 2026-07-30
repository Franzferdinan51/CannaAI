import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5174,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      preview: {
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [
        react(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              router: ['react-router-dom'],
              query: ['@tanstack/react-query'],
              ui: ['lucide-react', 'framer-motion'],
            },
          },
        },
        chunkSizeWarningLimit: 1000,
        // Terser was producing an invalid React element in the optimized
        // Settings chunk (React error #130). Vite's esbuild minifier keeps
        // the same optimized output without corrupting Radix/lazy modules.
        minify: 'esbuild',
        esbuild: {
          drop: mode === 'production' ? ['console', 'debugger'] : [],
        },
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          '@tanstack/react-query',
          'lucide-react',
        ],
      },
    };
});
