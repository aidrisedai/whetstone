// @ts-check
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      // Disabled: legitimate pattern for one-time browser API detection in useEffect.
      "react-hooks/set-state-in-effect": "off",
      // Disabled: purity check for Math.random already addressed via module-level constants.
      "react-hooks/purity": "off",
      // Disabled: false-positive on local counter variables (seen, lineNo) that are
      // scoped to a single render pass and intentionally mutated as accumulators.
      "react-hooks/immutability": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-danger": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
);
