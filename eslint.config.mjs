import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["error", "warn"] }],
      // Enforce Next.js image optimization best practice
      "@next/next/no-img-element": "warn",
      // Acknowledge dangerouslySetInnerHTML is intentional in syntax highlighter
      "react/no-danger": "off",
      // React hooks v7 strict rules — too aggressive for intentional patterns used here.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      // Flags render-time counters (e.g. lineNo++, seen++) as mutations — valid pattern here.
      "react-hooks/immutability": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "postcss.config.mjs"],
  },
);
