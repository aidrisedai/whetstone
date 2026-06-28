import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Only enable the two battle-tested hooks rules. react-hooks v7 added several
      // new rules (purity, set-state-in-effect, immutability) that flag common valid
      // React patterns (local counters in render, setState in effects, ref mutation)
      // and produce high false-positive noise. Keep the set minimal and stable.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Structured-output schemas use object literals — `object` type is fine here.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars are caught by tsc; allow underscore-prefixed intentional ignores.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
