import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow underscore-prefixed params as intentionally-ignored placeholders.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
    // Don't error on inline eslint-disable comments for plugins that aren't installed
    // (react-hooks, react, @next/next). They're correct suppressions — just missing plugins.
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "postcss.config.mjs",
      "next.config.mjs",
      "vitest.config.ts",
      "__tests__/**",
    ],
  },
);
