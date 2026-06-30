import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // These React 19 compiler rules fire on many idiomatic patterns
      // (initializing state/refs in effects, syncing from external state).
      // Disable until the rules stabilize.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
];

export default config;
