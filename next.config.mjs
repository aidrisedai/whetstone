/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing attacks.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only allow embedding from same origin (protects against clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Don't send the full URL as the referrer to third parties.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down unused browser features; keep microphone for Web Speech API.
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
