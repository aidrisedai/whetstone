import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: [".next/**", "node_modules/**"] },
  js.configs.recommended,

  // API routes + server-only lib run in Node.js
  {
    files: ["app/api/**/*.ts", "lib/anthropic.ts", "lib/scoring.ts"],
    languageOptions: { globals: { ...globals.node } },
  },

  // lib utilities that are used on both server and client
  {
    files: ["lib/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Client-side components and hooks run in the browser
  {
    files: ["app/**/*.tsx", "components/**/*.tsx", "hooks/**/*.ts"],
    languageOptions: { globals: { ...globals.browser } },
  },

  // TypeScript + React rules for all TS/TSX files
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,

      // Core hooks rules (stable, universally agreed upon)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // The react-hooks v7 plugin adds many new strict rules that flag valid
      // patterns (setState in effect for feature detection, ref mutation, local
      // let variables in render). Disable them to avoid false positives.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/globals": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/gating": "off",
      "react-hooks/config": "off",

      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
