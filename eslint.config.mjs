import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // React Compiler rules — only needed if using the React Compiler transform.
      // This project targets React 19 without the compiler, so these are too strict.
      "react-hooks/set-state-in-effect": "off",
      // App Router uses layout.tsx for fonts, not pages/_document.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
