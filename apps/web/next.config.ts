import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@hooligans/database', '@hooligans/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wow.zamimg.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
