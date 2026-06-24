import configNext from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...configNext,
  {
    rules: {
      // App Router doesn't use _document.js — this warning is a false positive.
      "@next/next/no-page-custom-font": "off",
      // setState inside a useEffect that syncs external/browser state is idiomatic
      // React. Downgrade to warn rather than block CI so real bugs stay visible.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
