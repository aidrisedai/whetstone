import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // These rules flag valid React patterns (feature detection, state sync,
      // ref mutation) and produce too many false positives in this codebase.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      // Allow _-prefixed identifiers as intentionally unused arguments/vars.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // no-page-custom-font was designed for pages/_document.js (Pages Router).
      // This project uses the App Router and the font loading is correct.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default eslintConfig;
