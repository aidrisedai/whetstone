import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // All setState-in-effect usages in this codebase are legitimate:
      // feature-detection at mount (setSupported) and external-state sync (mic, voice).
      "react-hooks/set-state-in-effect": "off",
      // Fires on local let accumulators inside useMemo — a known false-positive
      // for standard reduce-style patterns that are not state mutations.
      "react-hooks/immutability": "off",
      // False positive: next/font IS the correct App Router font pattern.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
