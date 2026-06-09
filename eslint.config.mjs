import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // setState in the body of a useEffect is a legitimate React pattern
      // (e.g. detecting browser APIs on mount, syncing mirror state from a hook).
      // The react-hooks/purity rule is too aggressive here.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      // App Router uses layout.tsx, not pages/_document.js — rule is n/a here.
      "@next/next/no-page-custom-font": "off",
      // Local render-phase counters and ref mutations are valid patterns that
      // the react-hooks/immutability rule flags incorrectly.
      "react-hooks/immutability": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "eslint.config.mjs"],
  },
];

export default config;
