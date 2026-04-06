/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the shared types package (TypeScript source package pattern)
  transpilePackages: ['@myvision/types'],

  // Standalone output for Docker deployment (self-contained server.js)
  output: 'standalone',

  // Proxy API requests to the NestJS backend
  // Dev: defaults to localhost:3001
  // Production: set API_INTERNAL_URL=http://api:3001 (Docker service name)
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.API_INTERNAL_URL || 'http://localhost:3001'}/api/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
