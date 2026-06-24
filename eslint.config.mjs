import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // Allow explicit `any` where needed (API boundaries, generics).
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars are errors; prefix with _ to suppress intentionally.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Key React rules.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Prefer Next.js <Image> over <img>.
      "@next/next/no-img-element": "warn",
    },
  },
);
