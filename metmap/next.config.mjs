/** @type {import('next').NextConfig} */
const nextConfig = {
  // MetMap runs at the root of metmap.fluxstudio.art
  // No basePath needed since we're a standalone subdomain app

  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Allow OAuth provider images (Google, GitHub avatars)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
