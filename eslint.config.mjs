import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Enforce the rules of hooks (call order, conditionals).
      "react-hooks/rules-of-hooks": "error",
      // Warn when effect/callback deps are incomplete.
      "react-hooks/exhaustive-deps": "warn",
      // Allow "as never" escape hatches in narrowly-scoped SDK type fixups.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars are a genuine bug signal; prefix with _ to acknowledge.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "coverage/**"],
  },
);
