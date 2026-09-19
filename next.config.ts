import type { NextConfig } from "next";

// Determine the target backend URL:
// 1. Explicit INTERNAL_BACKEND_URL (set in Vercel or environment)
// 2. Fallback to NEXT_PUBLIC_BACKEND_URL
// 3. Fallback to extracting origin from NEXT_PUBLIC_API_BASE_URL
// 4. In production, default to deployed Render backend (never points to localhost)
// 5. In local development, default to local Go service
const getBackendUrl = (): string => {
  let url =
    process.env.INTERNAL_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    '';

  if (!url && process.env.NEXT_PUBLIC_API_BASE_URL) {
    url = process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/?$/, '');
  }

  if (!url) {
    url =
      process.env.NODE_ENV === 'production'
        ? 'https://nutrisun-backend.onrender.com'
        : 'http://127.0.0.1:8080';
  }

  return url.replace(/\/+$/, '');
};

const backendUrl = getBackendUrl();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
