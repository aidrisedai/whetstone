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
      // Proven react-hooks rules only — the v7 additions (purity, immutability,
      // set-state-in-effect) generate too many false positives for legitimate
      // patterns (browser-feature-detection, local render counters, ref mutation).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
    ignores: ["node_modules/**", ".next/**", "vitest.config.ts", "postcss.config.mjs"],
  },
);
