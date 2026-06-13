import nextConfig from "eslint-config-next";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextConfig,
  ...nextTypescript,
  {
    rules: {
      // This project does not use the React Compiler, so the Compiler-specific
      // strictness rules produce false positives on valid patterns (feature
      // detection in useEffect, local counters in render helpers, etc.).
      // Demote to warnings so they're visible but non-blocking.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      // App Router layouts load fonts via <link> in the root layout — the Pages
      // Router restriction (_document.js) does not apply here.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
