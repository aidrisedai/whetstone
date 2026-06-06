// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Prefer explicit types for public API surfaces but allow inference inside functions
      "@typescript-eslint/no-explicit-any": "warn",
      // Don't require return types everywhere — TypeScript infers most safely
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Allow empty catch blocks (pattern used throughout for localStorage/API errors)
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Unused vars: underscore-prefix convention for intentional ignores
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Test files are allowed looser rules
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Ignore generated and build artifacts
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
);
