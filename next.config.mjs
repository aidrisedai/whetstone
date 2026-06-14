/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Disallow framing (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Block sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer — no cross-origin leakage.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Prevent XSS. 'unsafe-inline' is required for Tailwind's inline styles.
          // 'unsafe-eval' is required by Next.js dev mode; removed in production
          // by Next.js automatically. blob: is required for the built-app iframe.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "media-src 'self' blob:",
              "frame-src blob:",
              "connect-src 'self'",
              "font-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
