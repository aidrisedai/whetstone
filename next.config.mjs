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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Inline styles and scripts needed for Next.js + Tailwind.
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // srcdoc iframes (sandboxed app previews) are same-origin; data: for blob TTS audio.
              "media-src 'self' blob: data:",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://texttospeech.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
