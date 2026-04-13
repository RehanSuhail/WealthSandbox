import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '4kwallpapers.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/mc-api/:path*',
        destination: 'http://localhost:8000/api/simulate/:path*',
      },
    ];
  },
};

export default nextConfig;
