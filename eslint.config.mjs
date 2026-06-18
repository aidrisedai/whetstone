import tseslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
      react: reactPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // Classic react-hooks rules only (v7 added experimental React Compiler rules we skip)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // React safety rules
      "react/no-danger": "warn",
      // Next.js image optimization hint
      "@next/next/no-img-element": "warn",
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": ["error", { allowTernary: true }],
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  }
);
