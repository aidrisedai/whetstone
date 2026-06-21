import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  { ignores: ["node_modules/**", ".next/**"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      react: reactPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // Core React hooks correctness rules only (v7 recommended includes many experimental rules we skip).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-danger": "warn",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
