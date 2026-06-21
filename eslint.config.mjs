import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      // Stubs so inline eslint-disable comments for these rules don't error.
      react: { rules: { "no-danger": {} } },
      "@next/next": { rules: { "no-img-element": {} } },
    },
    rules: {
      // Only enforce the rule that catches real bugs (missing deps cause stale closures).
      // The purity / set-state-in-effect rules are intentionally not enabled:
      // SSR feature-detection (setSupported in an effect) and particle-system Math.random
      // are valid React patterns that those rules would incorrectly flag.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
);
