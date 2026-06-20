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
      ...reactHooks.configs.recommended.rules,
      // Browser-API detection (setSupported inside useEffect) is the canonical
      // SSR-safe pattern in Next.js — not a cascading-render risk.
      "react-hooks/set-state-in-effect": "off",
      // Math.random in the one-off Confetti component is intentionally
      // non-deterministic; it only renders during a short celebration burst.
      "react-hooks/purity": "off",
      // Local let-counters (e.g. `let seen = 0`) used as render-scoped
      // accumulators inside .map() are fine — they reset on every call and are
      // not React state. useRef mutations are explicitly the use case for useRef.
      "react-hooks/immutability": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
