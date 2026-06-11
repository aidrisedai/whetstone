import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Intentional pattern throughout: setState is used in effects to synchronize
      // with external systems (browser APIs, speech synthesis, etc.).
      "react-hooks/set-state-in-effect": "off",
      // App Router (Next.js 13+) handles fonts natively; this rule targets Pages Router.
      "@next/next/no-page-custom-font": "off",
    },
  },
];
