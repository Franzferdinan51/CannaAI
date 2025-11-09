import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  // 禁用 Next.js 热重载，由 nodemon 处理重编译
  reactStrictMode: false,
  // Output for static hosting (Netlify)
  output: 'export',
  // Remove trailing slash for static hosting
  trailingSlash: false,
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // 禁用 webpack 的热模块替换
      config.watchOptions = {
        ignored: ['**/*'], // 忽略所有文件变化
      };
    }
    // For static export, handle server-side imports
    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  eslint: {
    // 构建时忽略ESLint错误
    ignoreDuringBuilds: true,
  },
  // Ensure static export works properly
  experimental: {
    outputFileTracingIncludes: [
      'src/components/**/*',
      'src/lib/**/*',
      'public/**/*',
    ],
  },
};

export default nextConfig;
