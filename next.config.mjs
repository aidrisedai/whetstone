/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Anthropic API calls are server-side; this covers any client-side fetches
              "connect-src 'self'",
              // Inline styles needed by Tailwind; hashes would be preferable but Next.js inlines
              "style-src 'self' 'unsafe-inline'",
              // Next.js requires unsafe-eval in dev; omit in prod via the nonce approach or accept the tradeoff
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // The builder preview is rendered in a sandboxed iframe with a data: URI
              "frame-src 'self' blob:",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
