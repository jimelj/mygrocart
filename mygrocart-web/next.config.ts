import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.kroger.com',
      },
      {
        protocol: 'https',
        hostname: 'www.publix.com',
      },
      {
        protocol: 'https',
        hostname: 'weeklyad.publix.com',
      },
      {
        protocol: 'https',
        hostname: 'www.fooddepot.com',
      },
      {
        protocol: 'https',
        hostname: 'dam.flippenterprise.net',
      },
      {
        protocol: 'https',
        hostname: 'f.wishabi.net',
      },
      {
        protocol: 'https',
        hostname: 'production-endpoint.azureedge.net',
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
