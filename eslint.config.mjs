import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // setState-in-effect is valid for browser-API detection and derived state sync
      "react-hooks/set-state-in-effect": "off",
      // Font warning is a false positive in App Router (only applies to Pages Router)
      "@next/next/no-page-custom-font": "off",
    },
  },
];
