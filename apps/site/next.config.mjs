/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['react'],
  },
  images: {
    // Allow R2 images from Cloudflare
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image-demo.rent-in-ottawa.ca',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.rent-in-ottawa.ca',
        pathname: '/**',
      },
    ],
    // Cache images for 30 days (2592000 seconds)
    minimumCacheTTL: 2592000,
    // Disable image optimization for external URLs to prevent flickering
    unoptimized: false,
  },
  async headers() {
    const headers = []
    // Add X-Robots-Tag noindex on demo
    if (process.env.DEMO_NOINDEX === 'true') {
      headers.push({
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      });
    }
    // Add cache headers for images
    headers.push({
      source: '/_next/image(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000, immutable',
        },
      ],
    });
    return headers;
  },
};
export default nextConfig;
