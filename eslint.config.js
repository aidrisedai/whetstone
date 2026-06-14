// @ts-check
const nextConfig = require("eslint-config-next");

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      // React Compiler rules — enforce purity constraints needed for the
      // compiler's optimization pass. This project does not use the React
      // Compiler, so these rules produce false positives on valid patterns
      // (e.g. let counters inside useMemo, setState in feature-detection
      // effects). Re-enable if the compiler is adopted.
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
