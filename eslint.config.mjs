import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      // Next.js runs code in both Node (API routes) and browser (components/hooks).
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `no-undef` is superseded by TypeScript's own checks for .ts/.tsx files.
      "no-undef": "off",
    },
    linterOptions: {
      // Don't error on disable-directives that reference unused/unknown rules.
      reportUnusedDisableDirectives: false,
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "**/*.js", "**/*.mjs"],
  },
];
