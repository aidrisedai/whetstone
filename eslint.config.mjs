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
      // Permit the `as never` escape hatch used for the SDK image media_type union.
      "@typescript-eslint/no-explicit-any": "warn",
      // Empty catch blocks are intentional in several places (graceful fallbacks).
      "@typescript-eslint/no-empty-object-type": "off",
      // Unused vars with _ prefix are intentional placeholders.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // The set-state-in-effect rule flags the standard SSR-safe pattern of
      // detecting browser APIs in a useEffect and calling setState once. These
      // are intentional one-time capability checks, not cascading state updates.
      "react-hooks/set-state-in-effect": "off",
      // The immutability rule flags local counter variables (e.g. `seen += 1`)
      // used inside render-time map callbacks. These are not state or refs —
      // they are plain local accumulators valid in a render pass.
      "react-hooks/immutability": "off",
    },
  },
  {
    // Ignore generated and dependency directories.
    ignores: ["node_modules/**", ".next/**"],
  },
);
