// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // simplest: allow the whole Cloudinary domain
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**', // or `/dlleaeoeb/**` if you want to scope to your cloud_name
      },
    ],
    // Or, alternatively:
    // domains: ['res.cloudinary.com'],
  },
};

export default nextConfig;
