import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Allow intentionally-unused parameters and variables when prefixed with _.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // react-hooks/immutability flags local counter mutations inside useMemo
      // callbacks (e.g. running totals). Downgrade to warn until the codebase
      // migrates to a fully immutable style.
      "react-hooks/immutability": "warn",
      // Browser API detection via setState in useEffect is a well-established React
      // pattern. eslint-plugin-react-hooks v5's rule is too strict for these cases.
      "react-hooks/set-state-in-effect": "warn",
      // App Router uses layout.tsx for fonts — the pages/_document.js rule is a
      // false positive for Next.js App Router projects.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
