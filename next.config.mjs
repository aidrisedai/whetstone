/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent the page itself from being framed (the sandbox iframe embeds
          // builder-generated apps, so the ALLOWFROM / SAMEORIGIN model doesn't
          // apply — we simply block all top-level framing of Whetstone itself).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Allow the student's mic for voice-in, speaker for Google TTS.
          {
            key: "Permissions-Policy",
            value: "microphone=(self), speaker=(self), camera=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
