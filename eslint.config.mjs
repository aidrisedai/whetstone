// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      // Useful hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // React 19 strict rules are too noisy for existing patterns
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      // TypeScript
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  }
);
