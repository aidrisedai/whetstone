import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // React Compiler rule — flags valid patterns (browser feature detection,
      // effect-driven state init). Not using the compiler, so disable.
      "react-hooks/set-state-in-effect": "off",
      // App Router root layout loads on every page; the Pages-Router-specific
      // _document.js advice is a false positive here.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
