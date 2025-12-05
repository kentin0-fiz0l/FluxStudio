/** @type {import('next').NextConfig} */
const nextConfig = {
  // MetMap runs at the root of metmap.fluxstudio.art
  // No basePath needed since we're a standalone subdomain app

  // Enable standalone output for Docker deployment
  output: 'standalone',
};

export default nextConfig;
