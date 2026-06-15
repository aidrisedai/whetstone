import nextConfig from "eslint-config-next";

// react-hooks v7 ships React Compiler rules that are too strict for a non-Compiler app.
// Downgrade to warn so valid patterns (setState in effect, impure calls in useMemo deps)
// remain visible without blocking the build.
const config = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // App Router uses layout.tsx for fonts — the Pages Router warning is a false positive.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
