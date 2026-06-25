/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Inline styles and Next.js runtime need unsafe-inline; Tailwind v4 injects styles at runtime.
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Next.js hydration bundles + our own scripts.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Claude + Google TTS (server-side only, but CSP covers fetch() from the browser too).
              "connect-src 'self' https://api.anthropic.com https://texttospeech.googleapis.com",
              // Builder deep-link iframes (none actually embedded in our UI, but covers ExportCard links).
              "frame-src 'none'",
              // The sandboxed preview iframes use srcdoc (same-origin blob), not a remote URL.
              "img-src 'self' data: blob:",
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
