import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Allow underscore-prefixed parameters to signal intentionally unused args.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Next.js App Router loads fonts via layout.tsx, not _document.js — suppress the false positive.
      "@next/next/no-page-custom-font": "off",
    },
  },
];
export default config;
