import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow explicit `any` when necessary in server/API code
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars are errors in TS strict mode; keep as warn here
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
);
