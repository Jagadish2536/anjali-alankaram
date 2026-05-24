/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Security Headers ─────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // ── Image optimization ───────────────────────────────────────────
  images: {
    // Remove unoptimized: true to enable Next.js image optimization in production
    // Change to false when using AWS CloudFront with image resizing
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'anjali-alankaram-assets.s3.ap-south-1.amazonaws.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'http', hostname: 'localhost', port: '3000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3000' },
    ],
  },

  // ── Output ───────────────────────────────────────────────────────
  output: 'standalone', // Required for Docker deployment

  // ── Build optimizations ──────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // ── Ignore ───────────────────────────────────────────────────────
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ── Powered-by header removal ────────────────────────────────────
  poweredByHeader: false,
};

module.exports = nextConfig;
