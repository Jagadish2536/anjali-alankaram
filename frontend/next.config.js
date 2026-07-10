/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Experimental Performance Features ────────────────────────────
  experimental: {
    // Tree-shake large icon/animation libraries at build time
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
    ],
    // Modular imports reduce bundle size significantly
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

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
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://apis.google.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http://localhost:3000 https://*.googleusercontent.com",
              "connect-src 'self' https: wss: https://accounts.google.com https://*.googleapis.com https://*.razorpay.com",
              "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://accounts.google.com",
              "media-src 'self' https://*.s3.ap-south-2.amazonaws.com https://*.s3.amazonaws.com https://*.amazonaws.com https://*.cloudfront.net",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // ── Redirects ─────────────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/shop',
        destination: '/products',
        permanent: true,
      },
    ];
  },

  // ── Image Optimization ───────────────────────────────────────────
  images: {
    // Enable Next.js image optimization with WebP + AVIF
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    // Device breakpoints for responsive images
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1920],
    // Image sizes for layout=fixed and layout=intrinsic
    imageSizes: [16, 32, 64, 96, 128, 200, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache for optimized images
    dangerouslyAllowSVG: false,
    remotePatterns: [
      // S3 bucket (ap-south-2)
      {
        protocol: 'https',
        hostname: '*.s3.ap-south-2.amazonaws.com',
      },
      // S3 bucket (ap-south-1 — legacy)
      {
        protocol: 'https',
        hostname: '*.s3.ap-south-1.amazonaws.com',
      },
      // CloudFront CDN
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      // Google profile images (OAuth)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
      },
    ],
  },

  // ── Output ───────────────────────────────────────────────────────
  output: 'standalone', // Required for Docker deployment

  // ── Compiler ─────────────────────────────────────────────────────
  compiler: {
    // Remove all console.* in production except errors and warnings
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },

  // ── Build ─────────────────────────────────────────────────────────
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,

  // ── Webpack customizations ───────────────────────────────────────
  webpack: (config, { isServer }) => {
    // Ignore server-only modules on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
