import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  ...nextConfig,
  {
    rules: {
      // React Compiler strictness rules (react-hooks v7) flag many valid patterns
      // (setState in effects, local counter variables, variable reassignment in
      // utility functions) that are functionally correct. Disable until the
      // codebase is ready to adopt the React Compiler.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      // App Router uses next/font differently from Pages Router; not an issue.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
