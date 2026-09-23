import type { NextConfig } from "next";

// Determine the target backend URL:
// 1. Explicit NEXT_PUBLIC_API_URL or INTERNAL_BACKEND_URL (set in Vercel or environment)
// 2. Fallback to NEXT_PUBLIC_BACKEND_URL
// 3. Fallback to extracting origin from NEXT_PUBLIC_API_BASE_URL
// 4. In production (or when deployed on Vercel), ALWAYS ensure destination is https://nutrisun-backend-hirj.onrender.com
//    and NEVER allow localhost or 127.0.0.1 (prevents Vercel DNS_HOSTNAME_RESOLVED_PRIVATE errors)
// 5. In local development, default to local Go service
const getBackendUrl = (): string => {
  let url =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.INTERNAL_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    '';

  if (!url && process.env.NEXT_PUBLIC_API_BASE_URL) {
    url = process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/?$/, '');
  }

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined;

  const isLoopback = url.includes('localhost') || url.includes('127.0.0.1');

  // Guard: In production or Vercel deployments, never target loopback/private IPs
  if (!url || (isProduction && isLoopback)) {
    url = isProduction
      ? 'https://nutrisun-backend-hirj.onrender.com'
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
