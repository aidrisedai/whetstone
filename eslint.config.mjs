import nextConfig from "eslint-config-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const eslintConfig = [
  ...nextConfig,
  {
    plugins: { "@typescript-eslint": tsPlugin },
    languageOptions: { parser: tsParser },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // App Router loads fonts correctly in layout.tsx via React 19 <link> hoisting.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default eslintConfig;
