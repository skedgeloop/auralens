/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
};

module.exports = nextConfig;
