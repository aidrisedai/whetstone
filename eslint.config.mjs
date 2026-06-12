import { createRequire } from "module";
const require = createRequire(import.meta.url);
const nextConfig = require("eslint-config-next");

const config = [
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),
  {
    rules: {
      // App Router loads fonts in app/layout.tsx — this rule targets Pages Router only.
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-page-custom-font": "off",
      // All flagged instances are intentional browser-API bridge patterns (checking for
      // Web Speech API support, mirroring live transcript into a controlled input, syncing
      // speaking state from the synthesis engine). The React 19 strict rule is too aggressive
      // for these server-API-detection + external-event-sync use cases.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
