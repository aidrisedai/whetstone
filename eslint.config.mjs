import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // App Router doesn't use pages/_document.js — this rule is for Pages Router only.
      "@next/next/no-page-custom-font": "off",
      // setState inside effects is a legitimate pattern for browser-API detection
      // and state synchronization in this codebase.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
