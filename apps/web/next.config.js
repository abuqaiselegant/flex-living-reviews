/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: process.env.API_BASE_URL || 'http://localhost:3001/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
