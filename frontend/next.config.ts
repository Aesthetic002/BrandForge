import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/dashboard',
        destination: `${BACKEND_URL}/`,
      },
      {
        source: '/static/:path*',
        destination: `${BACKEND_URL}/static/:path*`,
      },
      {
        source: '/process-images',
        destination: `${BACKEND_URL}/process-images`,
      }
    ];
  }
};

export default nextConfig;
