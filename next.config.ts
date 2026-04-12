import type { NextConfig } from "next";

const PROXY_TARGET = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:8080';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pics.avs.io',
      },
    ],
  },
  async rewrites() {
    return [
      {
        // Proxy all /api/proxy/* requests to the backend — no CORS issues
        source: '/api/proxy/:path*',
        destination: `${PROXY_TARGET}/:path*`,
      },
    ];
  },
};

export default nextConfig;
