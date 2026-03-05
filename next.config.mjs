import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // react-pdf v10 is ESM-only — Next.js needs explicit transpilation
  transpilePackages: ["react-pdf"],

  // Allow larger API request bodies (for base64 images)
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  // pdfjs-dist has an optional dep on @napi-rs/canvas (Node native module).
  // Alias it to false so webpack skips it on both client and server.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required by Next.js for its runtime styles/scripts.
              // 'unsafe-eval' is required by PDF.js (used by react-pdf viewer in the browser
              // to evaluate worker code). It cannot be removed without switching to a
              // no-eval PDF.js build. @react-pdf/renderer runs server-side only (no eval needed).
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.safaricom.co.ke https://sandbox.safaricom.co.ke https://*.sentry.io https://unpkg.com",
              "frame-ancestors 'self'",
              "frame-src 'self' blob:",
              "worker-src 'self' blob: https://cdnjs.cloudflare.com https://unpkg.com",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG || "invopap",
  project: process.env.SENTRY_PROJECT || "invopap",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
