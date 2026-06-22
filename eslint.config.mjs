import nextConfig from "eslint-config-next/core-web-vitals";
import tsConfig from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextConfig,
  ...tsConfig,
  {
    rules: {
      // React Compiler lint rules — valid patterns today, warn until refactored.
      "react-hooks/set-state-in-effect": "warn",
      // App Router loads fonts via <link> in layout.tsx, not pages/_document.js.
      "@next/next/no-page-custom-font": "warn",
      // Allow _-prefixed names to mark intentionally unused params/vars.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
