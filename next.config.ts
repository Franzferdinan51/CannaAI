import type { NextConfig } from "next";

const isStaticExport = process.env.BUILD_MODE === 'static';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  // 禁用 Next.js 热重载，由 nodemon 处理重编译
  reactStrictMode: false,
  // Output for static hosting (Netlify) - only when BUILD_MODE=static
  ...(isStaticExport && {
    output: 'export',
    trailingSlash: false,
    images: {
      unoptimized: true
    },
  }),
  // Ensure static export works properly
  ...(isStaticExport && {
    outputFileTracingIncludes: {
      '*': ['src/components/**/*', 'src/lib/**/*', 'public/**/*'],
    },
  }),
  webpack: (config, { dev, isServer }) => {
    // Removed file watching ignore to allow API routes to work in development
    // For static export, handle server-side imports
    if (!dev && !isServer && isStaticExport) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        child_process: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        buffer: false,
        process: false,
      };
    }
    return config;
  },
  eslint: {
    // 构建时忽略ESLint错误
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_MODE: process.env.BUILD_MODE,
  },
  // Support for both serverless and server-based deployments
  serverExternalPackages: ['sharp', 'socket.io'],
};

export default nextConfig;
