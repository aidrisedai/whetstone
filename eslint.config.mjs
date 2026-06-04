import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "*.config.{js,mjs,ts}",
      "vitest.config.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // Ternaries used as statements for side effects (e.g. condition ? a() : b()) are valid.
      "@typescript-eslint/no-unused-expressions": ["error", { allowTernary: true }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // react-hooks plugin not installed; suppress unknown-rule errors from disable comments.
      "react-hooks/exhaustive-deps": "off",
    },
  },
);
