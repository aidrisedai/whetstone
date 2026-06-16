/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Limit incoming request bodies (API routes). Default is 4 MB; 1 MB is
  // plenty for the JSON payloads Whetstone sends (conversation history, etc.).
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js inline scripts + eval (used by Turbopack HMR in dev)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Tailwind inlines all styles
              "style-src 'self' 'unsafe-inline'",
              // Google Fonts (if added later)
              "font-src 'self' data:",
              // Anthropic API calls go server-side; only self fetch needed client-side
              "connect-src 'self'",
              // The sandbox preview iframe loads blob: URLs for the built app
              "frame-src 'self' blob:",
              "img-src 'self' data: blob:",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
