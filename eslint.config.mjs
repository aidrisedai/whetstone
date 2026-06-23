import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended"].rules,
      // Core react-hooks rules only; skip newer strict rules (purity, set-state-in-effect)
      // that flag legitimate patterns (confetti randomness, SSR feature-detection).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow "as never" casts used at Anthropic SDK type boundaries
      "@typescript-eslint/no-unsafe-assignment": "off",
      // Next.js image rule: prefer next/image over <img>
      "@next/next/no-img-element": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "vitest.config.ts", "__tests__/**"],
  },
];

export default config;
