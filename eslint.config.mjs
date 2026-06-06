import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // The no-page-custom-font rule targets pages/_document.js, not App Router.
      "@next/next/no-page-custom-font": "off",
      // react-hooks/set-state-in-effect is an overly aggressive new rule that flags
      // many correct initialization and sync patterns (e.g. setSupported(true) after
      // browser API detection, syncing external speech state to React state).
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
