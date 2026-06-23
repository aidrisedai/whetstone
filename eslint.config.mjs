import nextPlugin from "eslint-config-next";
import nextCwv from "eslint-config-next/core-web-vitals";
import tsPlugin from "eslint-config-next/typescript";

// React Compiler lint rules are only meaningful when babel-plugin-react-compiler
// is active. Until this project opts into the compiler, downgrade them to warnings.
const reactCompilerOverrides = {
  rules: {
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/immutability": "warn",
    "react-hooks/static-components": "warn",
    "react-hooks/use-memo": "warn",
    "react-hooks/preserve-manual-memoization": "warn",
    "react-hooks/globals": "warn",
    "react-hooks/refs": "warn",
    "react-hooks/error-boundaries": "warn",
    "react-hooks/set-state-in-render": "warn",
    "react-hooks/unsupported-syntax": "warn",
    "react-hooks/config": "warn",
    "react-hooks/gating": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
};

const config = [
  ...nextPlugin,
  ...nextCwv,
  ...tsPlugin,
  reactCompilerOverrides,
];

export default config;
