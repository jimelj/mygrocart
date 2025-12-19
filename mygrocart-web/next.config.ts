import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.cdn.shoprite.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.wakefern.com',
      },
      {
        protocol: 'https',
        hostname: 'target.scene7.com',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'weadflipp-957b.kxcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
      },
      {
        protocol: 'https',
        hostname: 'world.openfoodfacts.org',
      },
      {
        protocol: 'https',
        hostname: 'static.openfoodfacts.org',
      },
    ],
  },
};

export default nextConfig;
