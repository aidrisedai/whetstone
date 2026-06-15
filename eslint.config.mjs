import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginNext from "@next/eslint-plugin-next";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "@next/next": pluginNext,
    },
    rules: {
      // Allow explicit `any` — some boundaries genuinely warrant it
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused vars prefixed with _ (intentionally unused)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Allow ternary expressions used as statements (common React event handler pattern)
      "@typescript-eslint/no-unused-expressions": ["error", { allowTernary: true }],
      // Plugin rules below are off — they're registered so eslint-disable comments don't error
      "react/no-danger": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
);
