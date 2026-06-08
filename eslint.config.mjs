// @ts-check
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  // Base TypeScript rules
  ...tseslint.configs.recommended,

  // React + Next.js files
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // React
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed with React 17+
      "react/prop-types": "off",         // TypeScript handles this

      // Next.js
      ...nextPlugin.configs.recommended.rules,
      // App Router loads fonts in app/layout.tsx, not pages/_document.js.
      "@next/next/no-page-custom-font": "off",

      // TypeScript — relax a few noisy rules for this codebase
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // React Compiler rules (react-hooks v7) — disabled: this project does not
      // use the React Compiler. These rules flag legitimate patterns such as
      // SSR-safe browser API detection in useEffect and local render counters.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },

  // Ignore built output and deps
  {
    ignores: [".next/**", "node_modules/**"],
  },
);
