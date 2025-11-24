import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  eslint: {
    // Ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
  // Support for Netlify serverless deployment
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
