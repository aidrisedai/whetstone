import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Allow explicit `any` in server utils and demo stubs where types are intentionally loose.
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars: warn on all except intentionally-ignored `_` prefixed.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
);
