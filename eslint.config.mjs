// @ts-check
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
      // Register @next/next so disable comments for its rules don't error.
      "@next/next": nextPlugin,
      // Stub so existing eslint-disable-next-line react/no-danger comments don't error.
      react: { rules: { "no-danger": { create: () => ({}) } } },
    },
    rules: {
      // TypeScript safety
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // React hooks correctness
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Prevent common JS pitfalls
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": ["error", "always", { null: "ignore" }],
    },
  },
];
