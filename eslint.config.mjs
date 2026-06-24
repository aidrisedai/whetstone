import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  {
    rules: {
      // Flags legitimate browser-detection setState patterns (setSupported(true) on mount).
      "react-hooks/set-state-in-effect": "off",
      // Flags local render-scope counters (let seen = 0; seen += 1) and useRef mutations
      // as illegal mutations — both are correct React patterns.
      "react-hooks/immutability": "off",
      // App Router uses layout.tsx for fonts, not pages/_document.js (Pages Router rule).
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
