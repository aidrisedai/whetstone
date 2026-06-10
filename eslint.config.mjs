import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  {
    rules: {
      // App Router uses <link> for fonts in the root layout — the Pages Router
      // restriction on no-page-custom-font doesn't apply here.
      "@next/next/no-page-custom-font": "off",
      // All flagged occurrences are legitimate browser-API detection or
      // external-state-sync patterns (setSupported, setSpeaking, setInput in
      // mount effects). React recommends this pattern for SSR-safe feature checks.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;

