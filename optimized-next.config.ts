import type { NextConfig } from 'next';

const isStaticExport = process.env.BUILD_MODE === 'static';
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Performance Optimizations
  poweredByHeader: false,
  compress: true,

  // TypeScript
  typescript: {
    ignoreBuildErrors: !isProduction,
  },

  // ESLint
  eslint: {
    ignoreDuringBuilds: !isProduction,
  },

  // React Strict Mode (disabled for performance)
  reactStrictMode: false,

  // Image Optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    ...(isStaticExport && { unoptimized: true }),
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // Cache static assets
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache API responses
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer (only in production)
    if (isProduction && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }

    // Optimize for production
    if (isProduction && !isServer) {
      // Remove console logs in production
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Optimize chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            priority: 20,
          },
        },
      };
    }

    // Enable source maps in production
    if (isProduction) {
      config.devtool = 'source-map';
    }

    // Improve performance
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },

  // Experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Output configuration
  ...(isStaticExport && {
    output: 'export',
    trailingSlash: false,
    outputFileTracingIncludes: {
      '*': ['src/components/**/*', 'src/lib/**/*', 'public/**/*'],
    },
  }),

  // Environment variables
  env: {
    NEXT_PUBLIC_BUILD_MODE: process.env.BUILD_MODE,
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/settings/ai',
        destination: '/settings?tab=ai',
        permanent: true,
      },
      {
        source: '/settings/lmstudio',
        destination: '/settings?tab=lmstudio',
        permanent: true,
      },
      {
        source: '/ai-assistant',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Performance hints
  compiler: {
    removeConsole: isProduction ? { exclude: ['error'] } : false,
  },

  // Server external packages
  serverExternalPackages: [
    'sharp',
    'socket.io',
    '@prisma/client',
    'winston',
  ],
};

export default nextConfig;
