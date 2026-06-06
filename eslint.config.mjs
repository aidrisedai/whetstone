import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    rules: {
      // react-hooks v7 introduced several strict rules that produce false
      // positives for legitimate React patterns used throughout this codebase:
      //
      // - purity: flags Math.random() inside useMemo and local let-counter
      //   variables in render callbacks (both are idiomatic and safe).
      // - immutability: flags useRef.current mutations, which is the
      //   documented, intentional API for useRef.
      // - set-state-in-effect: flags browser-API feature detection
      //   (setSupported inside a [] effect) — the standard SSR-safe pattern.
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      // `no-page-custom-font` targets the Pages Router _document.js pattern;
      // App Router loads fonts in layout.tsx, so this warning doesn't apply.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
