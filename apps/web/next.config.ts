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
};

export default nextConfig;
