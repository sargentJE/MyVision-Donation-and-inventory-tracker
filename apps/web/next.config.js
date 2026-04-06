/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the shared types package (TypeScript source package pattern)
  transpilePackages: ['@myvision/types'],

  // Proxy API requests to the NestJS backend in development
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
