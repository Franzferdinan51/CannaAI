import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const configuredBackend = env.VITE_API_URL || env.CANNAAI_BACKEND_URL;
    const backendTarget = (configuredBackend || `http://127.0.0.1:${env.PORT || '3000'}`)
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
    return {
      server: {
        port: Number(env.CANNAAI_FRONTEND_PORT) || 5174,
        host: env.CANNAAI_FRONTEND_HOST || '127.0.0.1',
        allowedHosts: ['localhost', '127.0.0.1'],
        // Keep browser-relative API calls on the same origin while routing
        // them to the CannaAI backend during local development.
        proxy: {
          '/api': {
            target: backendTarget,
            changeOrigin: true,
            ws: true,
          },
        },
      },
      preview: {
        port: Number(env.CANNAAI_FRONTEND_PORT) || 5174,
        host: env.CANNAAI_FRONTEND_HOST || '127.0.0.1',
        allowedHosts: ['localhost', '127.0.0.1'],
        proxy: {
          '/api': {
            target: backendTarget,
            changeOrigin: true,
            ws: true,
          },
        },
      },
      plugins: [
        react(),
      ],
      define: {
        'globalThis.__VITE_API_URL__': JSON.stringify(env.VITE_API_URL || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          'es-toolkit/compat/get': path.resolve(__dirname, './src/lib/es-toolkit-get.ts'),
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
        // Vite 6's build-time dependency discovery can deadlock the esbuild
        // service on this large mixed ESM/CommonJS graph. The explicit
        // imports below remain available to Vite without the discovery pass.
        noDiscovery: true,
        include: [
          'react',
          'react-dom',
          'react-dom/client',
          'react-router-dom',
          '@tanstack/react-query',
          'lucide-react',
          'recharts',
          // socket.io-client and its CommonJS debug dependency must be
          // prebundled; otherwise Vite serves debug/src/browser.js as ESM and
          // the dashboard fails before React can mount.
          'socket.io-client',
          // Recharts imports the CJS compatibility entrypoint from this
          // package; prebundling prevents a raw CommonJS file from being
          // served as an ESM route chunk.
          'es-toolkit',
        ],
      },
    };
});
