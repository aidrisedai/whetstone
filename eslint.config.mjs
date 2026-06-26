import nextConfig from "eslint-config-next";
import nextTypescript from "eslint-config-next/typescript";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// These new React Compiler rules flag valid init/sync patterns in this codebase.
// Downgrade to warn so genuine purity errors (Math.random in render) still surface.
const ruleOverrides = {
  name: "whetstone/overrides",
  rules: {
    "react-hooks/set-state-in-effect": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
};

const eslintConfig = [...nextConfig, ...nextTypescript, ...nextCoreWebVitals, ruleOverrides];

export default eslintConfig;
