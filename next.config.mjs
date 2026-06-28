/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent the app from being embedded in iframes on other origins.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Block MIME-type sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer information sent to external sites.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict powerful features (camera off, microphone only for the app itself).
          { key: "Permissions-Policy", value: "camera=(), microphone=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
